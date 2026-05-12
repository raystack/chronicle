'use client'

import { useState, useCallback, useMemo } from 'react'
import type { OpenAPIV3 } from 'openapi-types'
import { Dialog, Flex, Button, Badge, IconButton, InputField, CopyButton, Select, Menu } from '@raystack/apsara'
import { Cross2Icon, ChevronDownIcon, ChevronUpIcon, PlayIcon, PlusIcon } from '@radix-ui/react-icons'
import { CounterClockwiseClockIcon, CodeIcon } from '@radix-ui/react-icons'
import { MethodBadge } from '@/components/api/method-badge'
import { flattenSchema, generateExampleJson, type SchemaField } from '@/lib/schema'
import { generateCurl } from '@/lib/snippet-generators'
import { JsonEditor } from '@/components/api/json-editor'
import styles from './playground-dialog.module.css'

type AuthScheme = {
  name: string
  type: 'apiKey' | 'bearer' | 'basic' | 'none'
  headerName: string
  placeholder: string
}

function getAuthSchemes(
  document: OpenAPIV3.Document,
  auth?: { type: string; header: string; placeholder?: string }
): AuthScheme[] {
  const schemes: AuthScheme[] = [{ name: 'None', type: 'none', headerName: '', placeholder: '' }]
  const securitySchemes = (document.components?.securitySchemes ?? {}) as Record<string, OpenAPIV3.SecuritySchemeObject>

  for (const [name, scheme] of Object.entries(securitySchemes)) {
    if (scheme.type === 'apiKey' && 'name' in scheme && 'in' in scheme && scheme.in === 'header') {
      schemes.push({ name: `API Key (${scheme.name})`, type: 'apiKey', headerName: scheme.name!, placeholder: 'Enter API key' })
    } else if (scheme.type === 'http' && 'scheme' in scheme) {
      if (scheme.scheme === 'bearer') {
        schemes.push({ name: 'Bearer Token', type: 'bearer', headerName: 'Authorization', placeholder: 'Enter bearer token' })
      } else if (scheme.scheme === 'basic') {
        schemes.push({ name: 'Basic Auth', type: 'basic', headerName: 'Authorization', placeholder: '' })
      }
    }
  }

  if (auth && !schemes.some((s) => s.headerName === auth.header && s.type !== 'none')) {
    schemes.push({ name: `API Key (${auth.header})`, type: 'apiKey', headerName: auth.header, placeholder: auth.placeholder ?? 'Enter API key' })
  }

  return schemes
}

interface PlaygroundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  method: string
  path: string
  operation: OpenAPIV3.OperationObject
  serverUrl: string
  specName: string
  auth?: { type: string; header: string; placeholder?: string }
  document: OpenAPIV3.Document
}

export function PlaygroundDialog({
  open, onOpenChange, method, path, operation, serverUrl, specName, auth, document,
}: PlaygroundDialogProps) {
  const params = (operation.parameters ?? []) as OpenAPIV3.ParameterObject[]
  const body = getRequestBody(operation.requestBody as OpenAPIV3.RequestBodyObject | undefined)

  const headerFields = paramsToFields(params.filter((p) => p.in === 'header'))
  const pathFields = paramsToFields(params.filter((p) => p.in === 'path'))
  const queryFields = paramsToFields(params.filter((p) => p.in === 'query'))

  const authSchemes = useMemo(() => getAuthSchemes(document, auth), [document, auth])
  const defaultScheme = authSchemes.find((s) => s.type !== 'none') ?? authSchemes[0]

  const [selectedScheme, setSelectedScheme] = useState(defaultScheme.name)
  const [authToken, setAuthToken] = useState('')
  const [basicUser, setBasicUser] = useState('')
  const [basicPass, setBasicPass] = useState('')
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({})
  const [pathValues, setPathValues] = useState<Record<string, string>>({})
  const [queryValues, setQueryValues] = useState<Record<string, string>>({})
  const [jsonMode, setJsonMode] = useState(false)
  const [bodyValues, setBodyValues] = useState<Record<string, unknown>>(() => {
    if (!body) return {}
    const init: Record<string, unknown> = {}
    for (const f of body.fields) {
      if (f.kind === 'array') init[f.name] = []
      else if (f.kind === 'object' || f.children) init[f.name] = {}
      else init[f.name] = ''
    }
    return init
  })
  const [bodyJsonStr, setBodyJsonStr] = useState(() => body ? body.jsonExample : '{}')

  const [responseData, setResponseData] = useState<{
    status: number; statusText: string; body: unknown; headers?: Record<string, string>; time: number
  } | null>(null)
  const [responseView, setResponseView] = useState<'body' | 'headers'>('body')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCollapse = (section: string) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const currentScheme = authSchemes.find((s) => s.name === selectedScheme) ?? authSchemes[0]

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (currentScheme.type === 'apiKey' && authToken) {
      headers[currentScheme.headerName] = authToken
    } else if (currentScheme.type === 'bearer' && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    } else if (currentScheme.type === 'basic' && (basicUser || basicPass)) {
      headers['Authorization'] = `Basic ${btoa(`${basicUser}:${basicPass}`)}`
    }
    return headers
  }, [currentScheme, authToken, basicUser, basicPass])

  const handleReset = () => {
    setSelectedScheme(defaultScheme.name)
    setAuthToken('')
    setBasicUser('')
    setBasicPass('')
    setHeaderValues({})
    setPathValues({})
    setQueryValues({})
    setBodyValues(() => {
      if (!body) return {}
      const init: Record<string, unknown> = {}
      for (const f of body.fields) {
        if (f.type.endsWith('[]')) init[f.name] = []
        else if (f.children) init[f.name] = {}
        else init[f.name] = ''
      }
      return init
    })
    setResponseData(null)
  }

  const handleSend = useCallback(async () => {
    setLoading(true)
    setResponseData(null)
    const startTime = performance.now()

    let resolvedPath = path
    for (const [key, value] of Object.entries(pathValues)) {
      if (value) resolvedPath = resolvedPath.replace(`{${key}}`, encodeURIComponent(value))
    }

    const queryEntries = Object.entries(queryValues).filter(([, v]) => v)
    const queryString = queryEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    const fullPath = queryString ? `${resolvedPath}?${queryString}` : resolvedPath

    const reqHeaders: Record<string, string> = { ...getAuthHeaders() }
    for (const [key, value] of Object.entries(headerValues)) {
      if (value) reqHeaders[key] = value
    }

    let reqBody: unknown = undefined
    if (body) {
      reqHeaders['Content-Type'] = body.contentType ?? 'application/json'
      if (jsonMode) {
        try { reqBody = JSON.parse(bodyJsonStr) } catch { reqBody = bodyValues }
      } else {
        reqBody = bodyValues
      }
    }

    try {
      const res = await fetch('/api/apis-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specName, method, path: fullPath, headers: reqHeaders, body: reqBody }),
      })
      const data = await res.json()
      const elapsed = Math.round(performance.now() - startTime)
      if (data.status !== undefined) {
        setResponseData({ ...data, time: elapsed })
      } else {
        setResponseData({ status: res.status, statusText: res.statusText, body: data.error ?? data, time: elapsed })
      }
    } catch {
      setResponseData({ status: 0, statusText: 'Error', body: 'Failed to send request', time: 0 })
    } finally {
      setLoading(false)
    }
  }, [specName, method, path, pathValues, queryValues, getAuthHeaders, headerValues, bodyValues, body])

  const responseJson = responseData
    ? (typeof responseData.body === 'string' ? responseData.body : JSON.stringify(responseData.body, null, 2))
    : ''

  const responseLines = responseJson ? responseJson.split('\n') : []

  const curlSnippet = useMemo(() => {
    const headers: Record<string, string> = { ...getAuthHeaders(), ...headerValues }
    if (body) headers['Content-Type'] = body.contentType ?? 'application/json'
    return generateCurl({ method, url: serverUrl + path, headers, body: body ? JSON.stringify(bodyValues) : undefined })
  }, [method, path, serverUrl, getAuthHeaders, headerValues, bodyValues, body])


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={styles.dialog} showCloseButton={false}>
        {/* Action Nav */}
        <Flex align='center' justify='between' className={styles.actionNav}>
          <span className={styles.actionNavTitle}>{operation.summary ?? `${method} ${path}`}</span>
          <Flex align='center' gap={3}>
            <IconButton size={2} onClick={handleReset} aria-label="Reset">
              <CounterClockwiseClockIcon />
            </IconButton>
            <IconButton size={2} onClick={() => onOpenChange(false)} aria-label="Close">
              <Cross2Icon />
            </IconButton>
          </Flex>
        </Flex>

        {/* Split Panel */}
        <Flex className={styles.splitPanel}>
          {/* Left Panel */}
          <Flex direction='column' className={styles.leftPanel}>
            <Flex align='center' className={styles.panelHeader}>
              <span className={styles.panelTitle}>Test request</span>
            </Flex>

            {/* Fields */}
            <div className={styles.fieldsScroll}>
              {/* Auth Section */}
              {(
                <>
                  <Flex align='center' gap={3} className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Authorization</span>
                    <IconButton size={2} onClick={() => toggleCollapse('auth')}>
                      {collapsed.auth ? <ChevronDownIcon /> : <ChevronUpIcon />}
                    </IconButton>
                  </Flex>
                  {!collapsed.auth && (
                    <>
                      {authSchemes.length > 2 && (
                        <Flex align='center' gap={3} className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>Type</span>
                          <div className={styles.fieldInput}>
                            <Select value={selectedScheme} onValueChange={setSelectedScheme}>
                              <Select.Trigger size="small">
                                <Select.Value />
                              </Select.Trigger>
                              <Select.Content>
                                {authSchemes.map((s) => (
                                  <Select.Item key={s.name} value={s.name}>{s.name}</Select.Item>
                                ))}
                              </Select.Content>
                            </Select>
                          </div>
                        </div>
                      )}
                      {currentScheme.type === 'basic' ? (
                        <>
                          <Flex align='center' gap={3} className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>Username</span>
                            <div className={styles.fieldInput}>
                              <InputField size="small" placeholder="Enter username" value={basicUser} onChange={(e) => setBasicUser(e.target.value)} />
                            </div>
                          </div>
                          <Flex align='center' gap={3} className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>Password</span>
                            <div className={styles.fieldInput}>
                              <InputField size="small" type="password" placeholder="Enter password" value={basicPass} onChange={(e) => setBasicPass(e.target.value)} />
                            </div>
                          </div>
                        </>
                      ) : currentScheme.type !== 'none' ? (
                        <Flex align='center' gap={3} className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>{currentScheme.headerName}</span>
                          <div className={styles.fieldInput}>
                            <InputField size="small" placeholder={currentScheme.placeholder} value={authToken} onChange={(e) => setAuthToken(e.target.value)} />
                          </div>
                        </div>
                      ) : null}
                      {headerFields.filter((f) => f.name !== currentScheme.headerName).map((f) => (
                        <div key={f.name} className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>{f.name}</span>
                          <div className={styles.fieldInput}>
                            <InputField size="small" placeholder="Enter value" value={headerValues[f.name] ?? ''} onChange={(e) => setHeaderValues({ ...headerValues, [f.name]: e.target.value })} />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* Path Params */}
              {pathFields.length > 0 && (
                <>
                  <Flex align='center' gap={3} className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Path Parameters</span>
                    <IconButton size={2} onClick={() => toggleCollapse('path')}>
                      {collapsed.path ? <ChevronDownIcon /> : <ChevronUpIcon />}
                    </IconButton>
                  </Flex>
                  {!collapsed.path && pathFields.map((f) => (
                    <div key={f.name} className={styles.fieldRow}>
                      <span className={styles.fieldLabel}>{f.name}</span>
                      <div className={styles.fieldInput}>
                        <InputField
                          size="small"
                          placeholder="Enter value"
                          value={pathValues[f.name] ?? ''}
                          onChange={(e) => setPathValues({ ...pathValues, [f.name]: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Query Params */}
              {queryFields.length > 0 && (
                <>
                  <Flex align='center' gap={3} className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Query Parameters</span>
                    <IconButton size={2} onClick={() => toggleCollapse('query')}>
                      {collapsed.query ? <ChevronDownIcon /> : <ChevronUpIcon />}
                    </IconButton>
                  </Flex>
                  {!collapsed.query && queryFields.map((f) => (
                    <div key={f.name} className={styles.fieldRow}>
                      <span className={styles.fieldLabel}>{f.name}</span>
                      <div className={styles.fieldInput}>
                        <InputField
                          size="small"
                          placeholder={f.description ?? 'Enter value'}
                          value={queryValues[f.name] ?? ''}
                          onChange={(e) => setQueryValues({ ...queryValues, [f.name]: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Body Section */}
              {body && (
                <>
                  <Flex align='center' gap={3} className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Body</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--rs-space-3)' }}>
                      <IconButton size={2} onClick={() => {
                        if (!jsonMode) {
                          setBodyJsonStr(JSON.stringify(bodyValues, null, 2))
                        } else {
                          try { setBodyValues(JSON.parse(bodyJsonStr)) } catch { /* ignore */ }
                        }
                        setJsonMode(!jsonMode)
                      }}>
                        <CodeIcon />
                      </IconButton>
                      <IconButton size={2} onClick={() => toggleCollapse('body')}>
                        {collapsed.body ? <ChevronDownIcon /> : <ChevronUpIcon />}
                      </IconButton>
                    </div>
                  </Flex>
                  {!collapsed.body && (
                    jsonMode ? (
                      <div className={styles.jsonEditorWrap}>
                        <JsonEditor
                          value={bodyJsonStr}
                          onChange={(val) => setBodyJsonStr(val)}
                        />
                      </div>
                    ) : (
                      body.fields.map((f) => (
                        <BodyFieldRow
                          key={f.name}
                          field={f}
                          value={bodyValues[f.name]}
                          onChange={(val) => setBodyValues({ ...bodyValues, [f.name]: val })}
                        />
                      ))
                    )
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className={styles.rightPanel}>
            <div className={styles.responseHeader}>
              <span className={styles.panelTitle}>Response</span>
              {responseData && (
                <Menu>
                  <Menu.Trigger render={<Button variant="text" color="neutral" size="small" trailingIcon={<ChevronDownIcon />} />}>
                    {responseView === 'body' ? 'Body' : 'Headers'}
                  </Menu.Trigger>
                  <Menu.Content>
                    <Menu.Item onClick={() => setResponseView('body')}>Body</Menu.Item>
                    <Menu.Item onClick={() => setResponseView('headers')}>Headers</Menu.Item>
                  </Menu.Content>
                </Menu>
              )}
            </div>

            {responseData ? (
              <>
                <div className={styles.statusBar}>
                  <span className={styles.statusText}>
                    Status : <span className={styles.statusValue}>{responseData.status}</span>
                  </span>
                  <div className={styles.statusSeparator} />
                  <span className={styles.statusText}>
                    Time : <span className={styles.statusValue}>{responseData.time} ms</span>
                  </span>
                </div>
                {responseView === 'body' ? (
                  <div className={styles.codeArea}>
                    <div className={styles.lineNumbers}>
                      {responseLines.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <pre className={styles.responseCode}>{responseJson}</pre>
                  </div>
                ) : (
                  <div className={styles.headersArea}>
                    {responseData.headers ? (
                      Object.entries(responseData.headers).map(([k, v]) => (
                        <div key={k} className={styles.headerRow}>
                          <span className={styles.headerKey}>{k}</span>
                          <span className={styles.headerValue}>{v}</span>
                        </div>
                      ))
                    ) : (
                      <div className={styles.emptyResponse}>No headers available</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyResponse}>
                {loading ? 'Sending...' : 'Send a request to see the response'}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.pathBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MethodBadge method={method} size="micro" />
              <span className={styles.pathText}>{path}</span>
            </div>
            <CopyButton text={curlSnippet} size={2} />
          </div>
          <Button
            variant="solid"
            color="accent"
            size="small"
            trailingIcon={<PlayIcon />}
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog>
  )
}

function BodyFieldRow({ field, value, onChange }: {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}) {
  const hasChildren = field.children && field.children.length > 0

  if (field.kind === 'array' && !hasChildren) {
    const items = Array.isArray(value) ? value as string[] : []
    return (
      <div className={styles.arrayField}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{field.name}</span>
          <IconButton size={2} onClick={() => onChange([...items, ''])} aria-label="Add item">
            <PlusIcon />
          </IconButton>
        </div>
        {items.map((item, i) => (
          <div key={i} className={styles.arrayItemRow}>
            <div className={styles.fieldInput}>
              <InputField
                size="small"
                placeholder={`${field.name}[${i}]`}
                value={String(item)}
                onChange={(e) => {
                  const updated = [...items]
                  updated[i] = e.target.value
                  onChange(updated)
                }}
              />
            </div>
            <IconButton size={2} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove item">
              <Cross2Icon />
            </IconButton>
          </div>
        ))}
      </div>
    )
  }

  if (hasChildren) {
    const objValue = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
    return (
      <div className={styles.arrayField}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>{field.name}</span>
        </div>
        <div className={styles.nestedFields}>
        {field.children!.map((child) => (
          <BodyFieldRow
            key={child.name}
            field={child}
            value={objValue[child.name]}
            onChange={(val) => onChange({ ...objValue, [child.name]: val })}
          />
        ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{field.name}</span>
      <div className={styles.fieldInput}>
        <InputField
          size="small"
          placeholder={field.description ?? 'Enter value'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

function paramsToFields(params: OpenAPIV3.ParameterObject[]): SchemaField[] {
  return params.map((p) => {
    const schema = (p.schema ?? {}) as OpenAPIV3.SchemaObject
    return {
      name: p.name,
      type: schema.type ? String(schema.type) : 'string',
      kind: (schema.type as SchemaField['kind']) ?? 'string',
      required: p.required ?? false,
      description: p.description,
    }
  })
}

interface RequestBody {
  contentType: string
  fields: SchemaField[]
  jsonExample: string
}

function getRequestBody(body: OpenAPIV3.RequestBodyObject | undefined): RequestBody | null {
  if (!body?.content) return null
  const contentType = Object.keys(body.content)[0]
  if (!contentType) return null
  const schema = body.content[contentType]?.schema as OpenAPIV3.SchemaObject | undefined
  if (!schema) return null
  return {
    contentType,
    fields: flattenSchema(schema),
    jsonExample: JSON.stringify(generateExampleJson(schema), null, 2),
  }
}
