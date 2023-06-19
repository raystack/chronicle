import React, { useEffect, useMemo, useState } from 'react';
import jsYaml from 'js-yaml';
import {OpenAPI, OpenAPIV3} from 'openapi-types'
import styles from './openapi.module.scss'
import SwaggerParser from "@apidevtools/swagger-parser";
import humanizeString from 'humanize-string';

interface OpenApiProps {
  schema: string;
  fileType?: 'yaml' | 'json';
}

export function OpenApi({fileType = "json", schema}: OpenApiProps) {
  const [parsedSchema, setParsedSchema] = useState<OpenAPI.Document | null>(null);

  useEffect(() => {
    const updateParsedSchema = async () => {
      const schemaObj :OpenAPI.Document = fileType === "json" ? JSON.parse(schema) : jsYaml.load(schema);
      const parsedSchemaObj = await SwaggerParser.parse(schemaObj);
      setParsedSchema(parsedSchemaObj);
    }
    if (!parsedSchema) {
      updateParsedSchema()
    }
  }, [parsedSchema, schema, fileType]);

  const paths = useMemo(() => {
    const paths = []
    for (let path in parsedSchema?.paths) {
      const methodsMap = parsedSchema?.paths[path]
      for (let method in methodsMap) {
        // @ts-ignore
        const data = methodsMap[method] as OpenAPIV3.OperationObject
        paths.push({
          key:`${method}-${path}`,
          path: path,
          method: method,
          operationData: data
        })
      }
    }
    return paths
  }, [parsedSchema])

  return <div className={styles.openapiWrapper}>
    {
      paths.map((pathData) => {
        const title = humanizeString(pathData?.operationData?.operationId || "");
        return <div className={styles.apiSection} key={pathData.key} id={pathData.operationData.operationId}>
          <div>
            <div className="title">{title}</div>
            <div className="description">{pathData.operationData.description || pathData.operationData.summary}</div>
          </div>
         <div></div>
      </div>
      })
    }
  </div>
}