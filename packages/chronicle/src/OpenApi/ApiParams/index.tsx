import { OpenAPIV3 } from "openapi-types";
import React from "react";
import * as _ from "lodash";
import styles from "./styles.module.css";

interface ApiParamsProps {
    schema: OpenAPIV3.Document;
    path: string;
    method: OpenAPIV3.HttpMethods;
}

interface ParamsListProps {
    title: string;
    params: OpenAPIV3.ParameterObject[];
}

function ParamsList({ title, params }: ParamsListProps) {
    return params.length ? (
        <div className={styles.paramsListWrapper}>
            <span className={styles.paramsListTitle}>{title}</span>
            <div className={styles.paramsList}>
                {params.map((param) => {
                    const { name, schema = {}, required, description } = param;
                    const { type } = schema as OpenAPIV3.SchemaObject;
                    return (
                        <div key={name} className={styles.paramsListItem}>
                            <div>
                                <span className={styles.paramTitle}>{name}</span>
                                {type ? <span className={styles.paramType}>{type}</span> : null}
                                {required ? <span className={styles.paramRequired}>Required</span> : null}
                            </div>
                            {description ? <div className={styles.paramDescription}>{description}</div> : null}
                        </div>
                    );
                })}
            </div>
        </div>
    ) : null;
}

export function ApiParams({ schema, path, method }: ApiParamsProps) {
    const operationData: OpenAPIV3.OperationObject = _.get(schema.paths, [path, method]);

    const headers = operationData.parameters?.filter((p) => (p as OpenAPIV3.ParameterObject).in === "header") || [];
    const queryParams = operationData.parameters?.filter((p) => (p as OpenAPIV3.ParameterObject).in === "query") || [];
    const pathParams = operationData.parameters?.filter((p) => (p as OpenAPIV3.ParameterObject).in === "path") || [];

    const showParams = headers.length || queryParams.length || pathParams.length;
    return showParams ? (
        <div>
            <span className={styles.title}>Params</span>
            <ParamsList title="Path Params" params={pathParams as OpenAPIV3.ParameterObject[]} />
            <ParamsList title="Headers" params={headers as OpenAPIV3.ParameterObject[]} />
            <ParamsList title="Query Params" params={queryParams as OpenAPIV3.ParameterObject[]} />
        </div>
    ) : null;
}
