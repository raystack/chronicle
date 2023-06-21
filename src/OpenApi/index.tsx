import React from "react";
import styles from "./styles.module.css";
import RequestPanel from "./RequestPanel";
import ApiURL from "./ApiUrl";
import ResponsePanel from "./ResponsePanel";
import useApiDefinitions from "./useApiDefinitions";
import ApiInfo from "./ApiInfo";

interface OpenApiProps {
    schema: string;
    fileType?: "yaml" | "json";
}

export function OpenApi({ schema }: OpenApiProps) {
    const apiDefinitions = useApiDefinitions({ schema });
    return (
        <div className={styles.openapiWrapper}>
            {apiDefinitions.map((api) => {
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
