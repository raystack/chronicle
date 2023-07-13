import React, { useMemo } from "react";
import styles from "./styles.module.css";
import RequestPanel from "./RequestPanel";
import ApiURL from "./ApiUrl";
import ResponsePanel from "./ResponsePanel";
import ApiInfo from "./ApiInfo";
import { OpenAPIV3 } from "openapi-types";
import { ApiParams } from "./ApiParams";
import StatusTable from "./StatusTable";
import { getApiPaths } from "../utils/parseSchema";

interface OpenApiProps {
    schema: OpenAPIV3.Document;
}

export function Root({ schema }: OpenApiProps) {
    const paths = useMemo(() => {
        return getApiPaths(schema);
    }, [schema]);

    return (
        <div className={styles.openapiWrapper}>
            {schema &&
                paths.map((path) => {
                    return (
                        <section className={styles.apiBlock} key={path.key} id={path.key}>
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
                        </section>
                    );
                })}
        </div>
    );
}
