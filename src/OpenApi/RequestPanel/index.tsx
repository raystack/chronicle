import React, { useCallback, useMemo } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { ItemDefinition, Request } from "postman-collection";
// @ts-ignore
import * as codegen from 'postman-code-generators'

const languages = [
  {
    id: 'curl',
    'lang': 'curl',
    'variant': 'cURL',
    label: 'cUrl'
  },
  {
    id: 'python',
    'lang': 'python',
    'variant': 'http.client',
    label: 'python'
  },
  {
    id: 'golang',
    'lang': 'go',
    'variant': 'Native',
    label: 'golang'
  },
]

interface RequestPanelProps {
  api: ItemDefinition
}

export default function RequestPanel({api}: RequestPanelProps) {
  const languagesWithApiData = useMemo(() => {
    return languages.map(lang => {
      const request = api.request ? new Request(api.request) : {}
      codegen.convert(lang.lang, lang.variant, request, {}, (err: any, data: any) => {
        lang.data = data
      })
      return lang
    })
  }, [])

  return <TabsPrimitive.Root defaultValue={languages[0].id}>
    <TabsPrimitive.List className="TabsList" aria-label="Manage your account">
      {languagesWithApiData.map(lang => {
        return <TabsPrimitive.Trigger className="TabsTrigger" value={lang.id} key={lang.id}>
        {lang.label}
        </TabsPrimitive.Trigger>
      })}
      </TabsPrimitive.List>
      {languagesWithApiData.map(lang => {
        return <TabsPrimitive.Content value={lang.id} key={lang.id}>
          <pre lang={lang.lang}>{lang.data}</pre>
        </TabsPrimitive.Content>
      })}
  </TabsPrimitive.Root>
}