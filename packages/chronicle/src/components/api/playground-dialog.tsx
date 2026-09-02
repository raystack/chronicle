'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { OpenAPIV3 } from 'openapi-types'
import { Dialog, Button, Badge, IconButton, Input, CopyButton, Select, Menu } from '@raystack/apsara'
import { ChevronDownIcon, ChevronUpIcon, CodeIcon, HistoryIcon, PlayIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import { MethodBadge } from '@/components/api/method-badge'
import { flattenSchema, generateExampleJson, toKind, type SchemaField } from '@/lib/schema'
import { generateCurl } from '@/lib/snippet-generators'
import { isStaticMode } from '@/lib/static-mode'
import { JsonEditor } from '@/components/api/json-editor'
import styles from './playground-dialog.module.css'

type ProxyResponse = {
  status: number
  statusText: string
  body: unknown
  headers?: Record<string, string>
}

async function sendViaProxy(
  specName: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<ProxyResponse> {
  const res = await fetch('/api/apis-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specName, method, path, headers, body }),
  })
  const data = await res.json()
  if (data.status !== undefined) return data
  return { status: res.status, statusText: res.statusText, body: data.error ?? data }
}

async function sendDirect(
  serverUrl: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<ProxyResponse> {
  const url = serverUrl + path
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const contentType = res.headers.get('content-type') ?? ''
    const responseBody = contentType.includes('application/json')
      ? await res.json()
      : await res.text()
    const responseHeaders: Record<string, string> = {}
    res.headers.forEach((v, k) => { responseHeaders[k] = v })
    return { status: res.status, statusText: res.statusText, body: responseBody, headers: responseHeaders }
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        `CORS Error: The API server at ${serverUrl} does not allow requests from this origin.\n` +
        `Ask the API server administrator to add this site's origin to their CORS allowed origins.`
      )
    }
    throw err
  }
}

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
      schemes.push({ name: `API Key (${scheme.name ?? name})`, type: 'apiKey', headerName: scheme.name ?? name, placeholder: 'Enter API key' })
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
  const storageKey = `chronicle:auth:${specName}`
  const savedAuth = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }, [storageKey])

  const [selectedScheme, setSelectedScheme] = useState(() => {
    if (savedAuth?.scheme && authSchemes.some((s) => s.name === savedAuth.scheme)) return savedAuth.scheme
    return defaultScheme.name
  })
  const [authToken, setAuthToken] = useState(savedAuth?.token ?? '')
  const [basicUser, setBasicUser] = useState(savedAuth?.basicUser ?? '')
  const [basicPass, setBasicPass] = useState(savedAuth?.basicPass ?? '')
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

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        scheme: selectedScheme,
        token: authToken,
        basicUser,
        basicPass,
      }))
    } catch { /* ignore */ }
  }, [storageKey, selectedScheme, authToken, basicUser, basicPass])

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
    try { sessionStorage.removeItem(storageKey) } catch { /* ignore */ }
    setHeaderValues({})
    setPathValues({})
    setQueryValues({})
    setBodyValues(() => {
      if (!body) return {}
      const init: Record<string, unknown> = {}
      for (const f of body.fields) {
        if (f.kind === 'array') init[f.name] = []
        else if (f.kind === 'object' || f.children) init[f.name] = {}
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
        try {
          reqBody = JSON.parse(bodyJsonStr)
        } catch {
          setResponseData({ status: 0, statusText: 'Error', body: 'Invalid JSON in request body', time: 0 })
          setLoading(false)
          return
        }
      } else {
        reqBody = bodyValues
      }
    }

    try {
      const data = isStaticMode()
        ? await sendDirect(serverUrl, method, fullPath, reqHeaders, reqBody)
        : await sendViaProxy(specName, method, fullPath, reqHeaders, reqBody)
      const elapsed = Math.round(performance.now() - startTime)
      setResponseData({ ...data, time: elapsed })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send request'
      setResponseData({ status: 0, statusText: 'Error', body: message, time: 0 })
    } finally {
      setLoading(false)
    }
  }, [specName, method, path, serverUrl, pathValues, queryValues, getAuthHeaders, headerValues, bodyValues, body])

  const responseJson = responseData
    ? (typeof responseData.body === 'string' ? responseData.body : JSON.stringify(responseData.body, null, 2))
    : ''

  const responseLines = responseJson ? responseJson.split('\n') : []

  const responseHeadersText = responseData?.headers
    ? Object.entries(responseData.headers).map(([k, v]) => `${k}: ${v}`).join('\n')
    : ''

  const curlSnippet = useMemo(() => {
    const headers: Record<string, string> = { ...getAuthHeaders(), ...headerValues }
    if (body) headers['Content-Type'] = body.contentType ?? 'application/json'
    const bodyStr = body ? (jsonMode ? bodyJsonStr : JSON.stringify(bodyValues)) : undefined
    return generateCurl({ method, url: serverUrl + path, headers, body: bodyStr })
  }, [method, path, serverUrl, getAuthHeaders, headerValues, bodyValues, bodyJsonStr, jsonMode, body])


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={styles.dialog} showCloseButton={false}>
        {/* Action Nav */}
        <div className={styles.actionNav}>
          <span className={styles.actionNavTitle}>{operation.summary ?? `${method} ${path}`}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--rs-space-3)' }}>
            <IconButton size={2} onClick={handleReset} aria-label="Reset">
              <HistoryIcon />
            </IconButton>
            <IconButton size={2} onClick={() => onOpenChange(false)} aria-label="Close">
              <XIcon />
            </IconButton>
          </div>
        </div>

        {/* Split Panel */}
        <div className={styles.splitPanel}>
          {/* Left Panel */}
          <div className={styles.leftPanel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Test request</span>
            </div>

            {/* Fields */}
            <div className={styles.fieldsScroll}>
              {/* Auth Section */}
              {(
                <>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Authorization</span>
                    <IconButton size={2} onClick={() => toggleCollapse('auth')}>
                      {collapsed.auth ? <ChevronDownIcon /> : <ChevronUpIcon />}
                    </IconButton>
                  </div>
                  {!collapsed.auth && (
                    <>
                      {authSchemes.length > 2 && (
                        <div className={styles.fieldRow}>
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
                          <div className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>Username</span>
                            <div className={styles.fieldInput}>
                              <Input size="small" placeholder="Enter username" value={basicUser} onValueChange={setBasicUser} />
                            </div>
                          </div>
                          <div className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>Password</span>
                            <div className={styles.fieldInput}>
                              <Input size="small" type="password" placeholder="Enter password" value={basicPass} onValueChange={setBasicPass} />
                            </div>
                          </div>
                        </>
                      ) : currentScheme.type !== 'none' ? (
                        <div className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>{currentScheme.headerName}</span>
                          <div className={styles.fieldInput}>
                            <Input size="small" placeholder={currentScheme.placeholder} value={authToken} onValueChange={setAuthToken} />
                          </div>
                        </div>
                      ) : null}
                      {headerFields.filter((f) => f.name !== currentScheme.headerName).map((f) => (
                        <div key={f.name} className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>{f.name}</span>
                          <div className={styles.fieldInput}>
                            <Input size="small" placeholder="Enter value" value={headerValues[f.name] ?? ''} onValueChange={(v) => setHeaderValues({ ...headerValues, [f.name]: v })} />
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
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Path Parameters</span>
                    <IconButton size={2} onClick={() => toggleCollapse('path')}>
                      {collapsed.path ? <ChevronDownIcon /> : <ChevronUpIcon />}
                    </IconButton>
                  </div>
                  {!collapsed.path && pathFields.map((f) => (
                    <div key={f.name} className={styles.fieldRow}>
                      <span className={styles.fieldLabel}>{f.name}</span>
                      <div className={styles.fieldInput}>
                        <Input
                          size="small"
                          placeholder="Enter value"
                          value={pathValues[f.name] ?? ''}
                          onValueChange={(v) => setPathValues({ ...pathValues, [f.name]: v })}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Query Params */}
              {queryFields.length > 0 && (
                <>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Query Parameters</span>
                    <IconButton size={2} onClick={() => toggleCollapse('query')}>
                      {collapsed.query ? <ChevronDownIcon /> : <ChevronUpIcon />}
                    </IconButton>
                  </div>
                  {!collapsed.query && queryFields.map((f) => (
                    <div key={f.name} className={styles.fieldRow}>
                      <span className={styles.fieldLabel}>{f.name}</span>
                      <div className={styles.fieldInput}>
                        <Input
                          size="small"
                          placeholder={f.description ?? 'Enter value'}
                          value={queryValues[f.name] ?? ''}
                          onValueChange={(v) => setQueryValues({ ...queryValues, [f.name]: v })}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Body Section */}
              {body && (
                <>
                  <div className={styles.sectionHeader}>
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
                  </div>
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
                <div className={styles.responseHeaderActions}>
                  <CopyButton text={responseView === 'body' ? responseJson : responseHeadersText} size={2} />
                  <Menu>
                    <Menu.Trigger render={<Button variant="text" color="neutral" size="small" trailingIcon={<ChevronDownIcon />} />}>
                      {responseView === 'body' ? 'Body' : 'Headers'}
                    </Menu.Trigger>
                    <Menu.Content>
                      <Menu.Item onClick={() => setResponseView('body')}>Body</Menu.Item>
                      <Menu.Item onClick={() => setResponseView('headers')}>Headers</Menu.Item>
                    </Menu.Content>
                  </Menu>
                </div>
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
          <span className={styles.fieldLabel}>{field.name} {field.required && <Badge variant="danger" size="micro">required</Badge>}</span>
          <IconButton size={2} onClick={() => onChange([...items, ''])} aria-label="Add item">
            <PlusIcon />
          </IconButton>
        </div>
        {items.map((item, i) => (
          <div key={i} className={styles.arrayItemRow}>
            <div className={styles.fieldInput}>
              <Input
                size="small"
                placeholder={`${field.name}[${i}]`}
                value={String(item)}
                onValueChange={(v) => {
                  const updated = [...items]
                  updated[i] = v
                  onChange(updated)
                }}
              />
            </div>
            <IconButton size={2} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove item">
              <XIcon />
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
      <span className={styles.fieldLabel}>{field.name} {field.required && <Badge variant="danger" size="micro">required</Badge>}</span>
      <div className={styles.fieldInput}>
        <Input
          size="small"
          placeholder={field.description ?? 'Enter value'}
          value={String(value ?? '')}
          onValueChange={(v) => onChange(v)}
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
      kind: toKind(schema.type),
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
