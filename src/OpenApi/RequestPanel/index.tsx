import React, { useMemo } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
// @ts-expect-error : TS definitions is not available for the package.
import * as codegen from "postman-code-generators";
import * as _ from "lodash";
import { OpenAPIV3 } from "openapi-types";
import { transformOpenApiRequestToPostman } from "../../utils/transformRequest";

interface Language {
    id: string;
    lang: string;
    variant: string;
    label: string;
    data?: string;
}

const languages: Language[] = [
    {
        id: "curl",
        lang: "curl",
        variant: "cURL",
        label: "cUrl",
    },
    {
        id: "python",
        lang: "python",
        variant: "http.client",
        label: "python",
    },
    {
        id: "golang",
        lang: "go",
        variant: "Native",
        label: "golang",
    },
    {
        id: "nodejs",
        lang: "nodejs",
        variant: "Native",
        label: "nodejs",
    },
];

interface RequestPanelProps {
    schema: OpenAPIV3.Document;
    path: string;
    method: OpenAPIV3.HttpMethods;
}

export default function RequestPanel({ schema, path, method }: RequestPanelProps) {
    const languagesWithApiData = useMemo(() => {
        const operationData: OpenAPIV3.OperationObject = _.get(schema.paths, [path, method]);
        const request = transformOpenApiRequestToPostman({ path, method, operationData }, schema);
        return languages.map((lang) => {
            codegen.convert(lang.lang, lang.variant, request, {}, (err: Error, data: string) => {
                if (!err) {
                    lang.data = data;
                }
            });
            return lang;
        });
    }, [path, method, schema]);

    return (
        <TabsPrimitive.Root defaultValue={languages[0].id}>
            <TabsPrimitive.List className="TabsList" aria-label="Manage your account">
                {languagesWithApiData.map((lang) => {
                    return (
                        <TabsPrimitive.Trigger className="TabsTrigger" value={lang.id} key={lang.id}>
                            {lang.label}
                        </TabsPrimitive.Trigger>
                    );
                })}
            </TabsPrimitive.List>
            {languagesWithApiData.map((lang) => {
                return (
                    <TabsPrimitive.Content value={lang.id} key={lang.id}>
                        <pre lang={lang.lang}>{lang.data}</pre>
                    </TabsPrimitive.Content>
                );
            })}
        </TabsPrimitive.Root>
    );
}
