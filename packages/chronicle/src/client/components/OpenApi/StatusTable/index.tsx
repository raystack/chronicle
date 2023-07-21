import { OpenAPIV3 } from "openapi-types";
import React, { useMemo } from "react";
import styles from "./styles.module.css";
import * as _ from "lodash";
import statuses from "statuses";

interface StatusTableProps {
    schema: OpenAPIV3.Document;
    path: string;
    method: OpenAPIV3.HttpMethods;
}

interface RespStatus {
    code: string;
    description: string;
}

export default function StatusTable({ schema, path, method }: StatusTableProps) {
    const operationData: OpenAPIV3.OperationObject = _.get(schema.paths, [path, method]);
    const responses = useMemo(() => {
        const respObj = _.get(operationData, "responses", {});
        return Object.keys(respObj).reduce((acc, statusKey) => {
            try {
                const code = statusKey === "default" ? "200" : statusKey;
                const statusMessage = statuses(code);
                acc.push({
                    code: code,
                    description: _.get(respObj, [statusKey, "description"], statusMessage),
                });
            } catch (err) {
                console.log(err);
            }
            return acc;
        }, [] as RespStatus[]);
    }, [operationData]);

    return responses.length ? (
        <div className={styles.StatusTableWrapper}>
            <span className={styles.title}>Responses</span>
            <table>
                <thead>
                    <tr>
                        <th>Status Code</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    {responses.map((resp, i) => (
                        <tr key={method + "-" + path + "-" + resp.code + "-" + i}>
                            <td>{resp.code}</td>
                            <td>{resp.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    ) : null;
}
