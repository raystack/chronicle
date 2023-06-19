import React, { useCallback, useEffect, useMemo, useState } from 'react';
import jsYaml from 'js-yaml';
import {OpenAPI, OpenAPIV3} from 'openapi-types'
import styles from './openapi.module.scss'
import SwaggerParser from "@apidevtools/swagger-parser";
import humanizeString from 'humanize-string';
import RequestPanel from './RequestPanel';
import { ItemDefinition, ItemGroupDefinition, Request} from 'postman-collection'
import {convert} from 'openapi-to-postmanv2'
import { promisify } from 'util';

const convertAsync = promisify(convert)
interface OpenApiProps {
  schema: string;
  fileType?: 'yaml' | 'json';
}

const MethodColorsMap: Record<OpenAPIV3.HttpMethods, string> = {
  "get": "green",
  "delete": "red",
  "post": "orange",
  "put": "blue",
  "patch": "orange",
  "trace": "grey",
  "options": "grey",
  "head": "grey"
}

interface PathData {
  key: string;
  path: string;
  method: OpenAPIV3.HttpMethods;
  operationData: OpenAPIV3.OperationObject;
}

const getApiDefinitions = (items: (ItemDefinition | ItemGroupDefinition)[]) : ItemDefinition[] => {
  let apis : ItemDefinition[] = []
  items?.forEach(item => {
    const itemDefinition = item as ItemDefinition;
    const itemGroupDefinition = item as ItemGroupDefinition;
    if (itemDefinition.request && itemDefinition.response) {
      apis.push(itemDefinition)
    } else if (itemGroupDefinition.item) {
      apis = apis.concat(getApiDefinitions(itemGroupDefinition.item))
    } 
  })
  return apis
}

export function OpenApi({fileType = "json", schema}: OpenApiProps) {
  const [parsedSchema, setParsedSchema] = useState<OpenAPI.Document | null>(null);
  const [apiDefinitions, setApiDefinitions] = useState<ItemDefinition[]>([]);

  useEffect(() => {
    const updateParsedSchema = async () => {
      const schemaObj :OpenAPI.Document = fileType === "json" ? JSON.parse(schema) : jsYaml.load(schema);
      const parsedSchemaObj = await SwaggerParser.parse(schemaObj);
      setParsedSchema(parsedSchemaObj);
    }
    if (!parsedSchema) {
      updateParsedSchema()
      parseApiDefinitions()
    }
  }, [parsedSchema, schema, fileType]);

  const paths = useMemo(() => {
    const paths: PathData[] = []
    for (let path in parsedSchema?.paths) {
      const methodsMap = parsedSchema?.paths[path]
      for (let method in methodsMap) {
        // @ts-ignore
        const data = methodsMap[method]
        paths.push({
          key:`${method}-${path}`,
          path: path,
          method: method as OpenAPIV3.HttpMethods,
          operationData: data
        })
      }
    }
    return paths
  }, [parsedSchema])



  const parseApiDefinitions = useCallback(async () => {
    const type = "string"
    const postmanCollection = await convertAsync({type, data: schema}, undefined )
    if (postmanCollection.result === true) {
      let apis: ItemDefinition[] = []
      postmanCollection.output.forEach(collection => {
        if (collection.data.item) {
          apis = apis.concat(getApiDefinitions(collection.data.item))
        }
      });
      setApiDefinitions(apis)
    }
  }, [schema])

  const apisMap = useMemo(() => {
    return apiDefinitions.reduce((acc, api) => {
      const path = typeof api.request?.url === "object" 
        ? Array.isArray(api.request.url?.path) 
          ? api.request.url?.path.reduce((acc, p) => {
            const value = p.startsWith(":") ? "{" + p.slice(1) + "}" : p
            return acc + "/" + value
          }, "")
          : api.request.url?.path
        : api.request?.url
      const key = `${api.request?.method?.toLowerCase()}-${path}`;
      acc[key] = api
      return acc
    }, {} as Record<string, ItemDefinition>)
  }, [apiDefinitions])

  return <div className={styles.openapiWrapper}>
    {
      paths.map((pathData) => {
        const api = apisMap[pathData.key];
        const title = humanizeString(pathData?.operationData?.operationId || "");
        return <div className={styles.apiBlock} key={pathData.key} id={pathData.operationData.operationId}>
          <div className={styles.apiInfoSection}>
            <div className={styles.title}>{title}</div>
            <div className={styles.description}>{pathData.operationData.description || pathData.operationData.summary}</div>
          </div>
         <div className={styles.apiDataSection}>
          <div className={styles.apiMethodAndPath}>
            <div className={styles.apiMethod} style={{backgroundColor: MethodColorsMap[pathData.method]}}>{pathData.method}</div>
            <div className={styles.apiPath}>{pathData.path}</div>
          </div>
          <RequestPanel api={api}/>
         </div>
      </div>
      })
    }
  </div>
}