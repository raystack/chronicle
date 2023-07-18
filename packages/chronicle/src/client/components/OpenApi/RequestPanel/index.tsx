import React, { useMemo, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import styles from "./styles.module.css";
// @ts-expect-error : TS definitions is not available for the package.
import * as codegen from "postman-code-generators";
import * as _ from "lodash";
import { OpenAPIV3 } from "openapi-types";
import { transformOpenApiRequestToPostman } from "../../../utils/transformRequest";

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
    const [selectedLangId, setSelectedLangId] = useState(languages[0].id);

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

    const selectedLang = useMemo(() => {
        return languagesWithApiData.find((lang) => lang.id === selectedLangId) || null;
    }, [languagesWithApiData, selectedLangId]);

    return (
        <div>
            <div>
                <SelectPrimitive.Root defaultValue={selectedLangId} onValueChange={setSelectedLangId}>
                    <SelectPrimitive.Trigger className={styles.SelectTrigger} aria-label="Language">
                        <SelectPrimitive.Value placeholder="Select a language" />
                    </SelectPrimitive.Trigger>
                    <SelectPrimitive.Portal>
                        <SelectPrimitive.Content className={styles.SelectContent}>
                            <SelectPrimitive.Viewport className={styles.SelectViewport}>
                                {languagesWithApiData.map((lang) => {
                                    return (
                                        <SelectPrimitive.Item
                                            value={lang.id}
                                            key={lang.id}
                                            className={styles.SelectItem}
                                        >
                                            <SelectPrimitive.ItemText>{lang.label}</SelectPrimitive.ItemText>
                                        </SelectPrimitive.Item>
                                    );
                                })}
                            </SelectPrimitive.Viewport>
                        </SelectPrimitive.Content>
                    </SelectPrimitive.Portal>
                </SelectPrimitive.Root>
            </div>
            <div>
                {selectedLang ? (
                    <pre lang={selectedLang.lang} className={styles.Code}>
                        {selectedLang.data}
                    </pre>
                ) : null}
            </div>
        </div>
    );
}
