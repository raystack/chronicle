import React, {  useEffect, useState } from 'react';
import styles from './styles.module.scss'
import RequestPanel from './RequestPanel';
import { ItemDefinition, ItemGroupDefinition, Request} from 'postman-collection'
import {convert} from 'openapi-to-postmanv2'
import { promisify } from 'util';
import ApiURL from './ApiUrl';
import ResponsePanel from './ResponsePanel';

const convertAsync = promisify(convert)
interface OpenApiProps {
  schema: string;
  fileType?: 'yaml' | 'json';
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
  const [apiDefinitions, setApiDefinitions] = useState<ItemDefinition[]>([]);

  useEffect(() => {
    const parseApiDefinitions = async () => {
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
    }
    if (apiDefinitions.length < 1) {
      parseApiDefinitions()
    }
  }, [schema, fileType]);

  return <div className={styles.openapiWrapper}>
    {
      apiDefinitions.map((api) => {
        const description = typeof api.request?.description === "string" ? api.request?.description : api.request?.description?.content;
        const title = api.name;
        return <div className={styles.apiBlock} key={api.id}>
          <div className={styles.apiInfoSection}>
            <div className={styles.title}>{title}</div>
            <div className={styles.description}>{description}</div>
          </div>
         <div className={styles.apiDataSection}>
          <ApiURL api={api} />
          <RequestPanel api={api}/>
          <ResponsePanel api={api} />
         </div>
      </div>
      })
    }
  </div>
}