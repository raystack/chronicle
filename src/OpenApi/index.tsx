import React, { useEffect, useMemo, useState } from "react";
import styles from "./styles.module.css";
import RequestPanel from "./RequestPanel";
import ApiURL from "./ApiUrl";
import ResponsePanel from "./ResponsePanel";
import ApiInfo from "./ApiInfo";
import jsYaml from "js-yaml";
import { OpenAPIV3 } from "openapi-types";
import SwaggerParser from "@apidevtools/swagger-parser";

interface OpenApiProps {
    schema: string;
    fileType?: "yaml" | "json";
}

interface PathData {
    key: string;
    path: string;
    method: OpenAPIV3.HttpMethods;
    operationData: OpenAPIV3.OperationObject;
}

export function OpenApi({ schema, fileType }: OpenApiProps) {
    const [parsedSchema, setParsedSchema] = useState<OpenAPIV3.Document | null>(null);

    useEffect(() => {
        const updateParsedSchema = async () => {
            const schemaObj: OpenAPIV3.Document = fileType === "json" ? JSON.parse(schema) : jsYaml.load(schema);
            const parsedSchemaObj = (await SwaggerParser.parse(schemaObj, {
                resolve: { file: true, external: true, http: true },
                dereference: { circular: true },
                parse: {
                    json: true,
                    yaml: true,
                    text: true,
                },
            })) as OpenAPIV3.Document;
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

    return (
        <div className={styles.openapiWrapper}>
            {parsedSchema &&
                paths.map((path) => {
                    return (
                        <div className={styles.apiBlock} key={path.key}>
                            <ApiInfo schema={parsedSchema} path={path.path} method={path.method} />
                            <div className={styles.apiDataSection}>
                                <ApiURL path={path.path} method={path.method} />
                                <RequestPanel schema={parsedSchema} path={path.path} method={path.method} />
                                {/* 
                            <ResponsePanel api={api} /> */}
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}
