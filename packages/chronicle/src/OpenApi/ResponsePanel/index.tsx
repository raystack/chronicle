import { OpenAPIV3 } from "openapi-types";
import React, { useMemo } from "react";
import * as _ from "lodash";
import { getExampleBody, getRefObject } from "../../utils/transformRequest";

interface ResponsePanelProps {
    schema: OpenAPIV3.Document;
    path: string;
    method: OpenAPIV3.HttpMethods;
}

interface RespWithBody {
    status: string;
    body: any;
}

export default function ResponsePanel({ schema, path, method }: ResponsePanelProps) {
    const operationData: OpenAPIV3.OperationObject = _.get(schema.paths, [path, method]);

    const respWithBody = useMemo(() => {
        const respObj = _.get(operationData, "responses", {});
        return Object.entries(respObj).reduce((acc, resp) => {
            const data = resp[1] as OpenAPIV3.ResponseObject;
            if (_.has(data, ["content", "application/json"])) {
                const contentSchema = _.get(data, ["content", "application/json", "schema"]);
                if (contentSchema.$ref) {
                    const refValue = getRefObject(contentSchema.$ref, schema);
                    const body = getExampleBody(refValue);
                    acc.push({
                        status: resp[0],
                        body,
                    });
                } else if (contentSchema.type === "array" && _.has(contentSchema, ["items", "$ref"])) {
                    const refValue = getRefObject(contentSchema.$ref, schema);
                    const body = getExampleBody(refValue);
                    acc.push({
                        status: resp[0],
                        body: [body],
                    });
                }
            }
            return acc;
        }, [] as RespWithBody[]);
    }, [operationData]);

    return respWithBody.length ? (
        <div>
            <span>Response Body</span>
            <pre lang="json">{JSON.stringify(respWithBody[0].body, null, 4)}</pre>
        </div>
    ) : null;
}
