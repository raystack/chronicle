import React, { useMemo } from 'react'
import styles from './styles.module.css';
import { ItemDefinition } from 'postman-collection';


const MethodColorsMap: Record<string, string> = {
  "get": "green",
  "delete": "red",
  "post": "orange",
  "put": "blue",
  "patch": "orange",
  "trace": "grey",
  "options": "grey",
  "head": "grey"
}

interface ApiURLProps {
  api: ItemDefinition
}

export default function ApiURL({api}: ApiURLProps) {
  const method = api.request?.method?.toLowerCase();
  const path = useMemo(() => {
    return typeof api.request?.url === "object" 
  ? Array.isArray(api.request.url?.path) 
    ? api.request.url?.path.reduce((acc, p) => {
      const value = p.startsWith(":") ? "{" + p.slice(1) + "}" : p
      return acc + "/" + value
    }, "")
    : api.request.url?.path
  : api.request?.url;
  }, [api.request])
  return <div className={styles.apiMethodAndPath}>
  {method ? <div className={styles.apiMethod} style={{backgroundColor: MethodColorsMap[method]}}>{method}</div> : null}
  <div className={styles.apiPath}>{path}</div>
</div>
}