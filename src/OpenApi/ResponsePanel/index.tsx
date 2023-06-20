import { ItemDefinition } from "postman-collection";
import React, { useMemo } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs"


interface ResponsePanelProps {
  api: ItemDefinition
}
export default function ResponsePanel({api}: ResponsePanelProps) {
  const responses = useMemo(() => {
    return api.response || [];
  }, [api.response])
  return <TabsPrimitive.Root defaultValue={responses?.[0].code?.toString()}>
  <TabsPrimitive.List className="TabsList" aria-label="Manage your account">
    {responses.map(resp => {
      const statusCode = resp.code.toString()
      return <TabsPrimitive.Trigger className="TabsTrigger" value={statusCode} key={statusCode}>
      {statusCode}
      </TabsPrimitive.Trigger>
    })}
    </TabsPrimitive.List>
    {responses.map(resp => {
      const statusCode = resp.code.toString()
      const lang = resp.header?.some(h => h.key === 'Content-Type' && h.value === 'application/json') ? 'json' : 'text';
      return <TabsPrimitive.Content value={statusCode} key={statusCode}>
        {resp.body ? <pre lang={lang}>{resp.body}</pre> : 'empty'}
      </TabsPrimitive.Content>
    })}
</TabsPrimitive.Root>
}