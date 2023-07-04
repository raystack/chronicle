import React from "react";
import styles from "./styles.module.css";
import { OpenAPIV3 } from "openapi-types";
import * as _ from "lodash";

const MethodColorsMap: Record<string, string> = {
    get: "green",
    delete: "red",
    post: "orange",
    put: "blue",
    patch: "orange",
    trace: "grey",
    options: "grey",
    head: "grey",
};

interface ApiURLProps {
    path: string;
    method: OpenAPIV3.HttpMethods;
}

export default function ApiURL({ path, method }: ApiURLProps) {
    return (
        <div className={styles.apiMethodAndPath}>
            <div className={styles.apiMethod} style={{ backgroundColor: MethodColorsMap[method] }}>
                {method}
            </div>
            <div className={styles.apiPath}>{path}</div>
        </div>
    );
}
