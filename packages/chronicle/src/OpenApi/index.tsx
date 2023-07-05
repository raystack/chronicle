import React, { useMemo } from "react";
import styles from "./styles.module.css";
import RequestPanel from "./RequestPanel";
import ApiURL from "./ApiUrl";
import ResponsePanel from "./ResponsePanel";
import ApiInfo from "./ApiInfo";
import { OpenAPIV3 } from "openapi-types";
import { ApiParams } from "./ApiParams";
import StatusTable from "./StatusTable";

interface OpenApiProps {
    schema: OpenAPIV3.Document;
}

interface PathData {
    key: string;
    path: string;
    method: OpenAPIV3.HttpMethods;
    operationData: OpenAPIV3.OperationObject;
}

export function OpenApi({ schema }: OpenApiProps) {
    const paths = useMemo(() => {
        const paths: PathData[] = [];
        for (const path in schema?.paths) {
            const methodsMap = schema?.paths[path];
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
    }, [schema]);

    return (
        <div className={styles.openapiWrapper}>
            {schema &&
                paths.map((path) => {
                    return (
                        <div className={styles.apiBlock} key={path.key}>
                            <div className={styles.apiDataSection}>
                                <ApiInfo schema={schema} path={path.path} method={path.method} />
                                <ApiParams schema={schema} path={path.path} method={path.method} />
                                <StatusTable schema={schema} path={path.path} method={path.method} />
                            </div>
                            <div className={styles.apiDataSection}>
                                <ApiURL path={path.path} method={path.method} />
                                <RequestPanel schema={schema} path={path.path} method={path.method} />
                                <ResponsePanel schema={schema} path={path.path} method={path.method} />
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}