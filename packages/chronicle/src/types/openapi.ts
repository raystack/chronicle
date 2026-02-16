export interface ApiSpec {
  name: string
  version: string
  description?: string
  server: { url: string; description?: string }
  auth?: { type: string; header: string; placeholder?: string }
  basePath: string
  tags: ApiTag[]
}

export interface ApiTag {
  name: string
  description?: string
  operations: ApiOperation[]
}

export interface ApiOperation {
  operationId: string
  method: string
  path: string
  summary?: string
  description?: string
  tags: string[]
  parameters: ApiParameter[]
  requestBody?: ApiRequestBody
  responses: ApiResponse[]
}

export interface ApiParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  type: string
  required: boolean
  description?: string
  default?: unknown
}

export interface ApiRequestBody {
  contentType: string
  required: boolean
  schema: ApiSchemaField[]
}

export interface ApiResponse {
  status: string
  description?: string
  schema: ApiSchemaField[]
}

export interface ApiSchemaField {
  name: string
  type: string
  required: boolean
  description?: string
  default?: unknown
  children?: ApiSchemaField[]
}
