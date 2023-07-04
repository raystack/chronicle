import React, { useMemo } from "react";
import styles from "./styles.module.css";
import { OpenAPIV3 } from "openapi-types";
import * as _ from "lodash";

interface ApiInfoProps {
    schema: OpenAPIV3.Document;
    path: string;
    method: OpenAPIV3.HttpMethods;
}

export default function ApiInfo({ schema, path, method }: ApiInfoProps) {
    const api: OpenAPIV3.OperationObject = useMemo(() => {
        return _.get(schema.paths, [path, method]);
    }, [schema.paths, path, method]);

    const description = api.description || api.summary;
    const title = `${method.toUpperCase()} ${path}`;
    return (
        <div className={styles.apiInfoSection}>
            <div className={styles.title}>{title}</div>
            <div className={styles.description}>{description}</div>
        </div>
    );
}
