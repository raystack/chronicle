import React, { useEffect, useMemo, useState } from "react";
import styles from "./styles.module.css";
import RequestPanel from "./RequestPanel";
import ApiURL from "./ApiUrl";
import ResponsePanel from "./ResponsePanel";
import ApiInfo from "./ApiInfo";
import jsYaml from "js-yaml";
import { OpenAPI, OpenAPIV3 } from "openapi-types";
import SwaggerParser from "@apidevtools/swagger-parser";
import { transformOpenApiRequestToPostman } from "../utils/transformRequest";

interface OpenApiProps {
    schema: string;
    fileType?: "yaml" | "json";
}

interface PathData {
    key: string;
    path: string;
    method: OpenAPIV3.HttpMethods;
    operationData: OpenAPI.Operation;
}

export function OpenApi({ schema, fileType }: OpenApiProps) {
    const [parsedSchema, setParsedSchema] = useState<OpenAPI.Document | null>(null);

    useEffect(() => {
        const updateParsedSchema = async () => {
            const schemaObj: OpenAPI.Document = fileType === "json" ? JSON.parse(schema) : jsYaml.load(schema);
            const parsedSchemaObj = await SwaggerParser.parse(schemaObj, {
                resolve: { file: true, external: true, http: true },
                dereference: { circular: true },
                parse: {
                    json: true,
                    yaml: true,
                    text: true,
                },
            });
            setParsedSchema(parsedSchemaObj);
        };

        updateParsedSchema();
    }, [schema]);

    const paths = useMemo(() => {
        const paths: PathData[] = [];
        for (const path in parsedSchema?.paths) {
            const methodsMap = parsedSchema?.paths[path];
            for (const method in methodsMap) {
                // @ts-ignore
                const data: OpenAPIV3.OperationObject = methodsMap[method];
                paths.push({
                    key: `${method}-${path}`,
                    path: path,
                    method: method as OpenAPIV3.HttpMethods,
                    operationData: data,
                });
            }
        }
        return paths;
    }, [parsedSchema]);

    const defs = useMemo(() => {
        return parsedSchema ? paths.map((p) => transformOpenApiRequestToPostman(p, parsedSchema)) : [];
    }, [paths]);

    return (
        <div className={styles.openapiWrapper}>
            {defs.map((api) => {
                return (
                    <div className={styles.apiBlock} key={api.id}>
                        <ApiInfo api={api} />
                        <div className={styles.apiDataSection}>
                            <ApiURL api={api} />
                            <RequestPanel api={api} />
                            <ResponsePanel api={api} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
