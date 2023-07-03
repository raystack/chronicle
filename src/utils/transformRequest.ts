import { OpenAPIV3, OpenAPI, OpenAPIV2 } from "openapi-types";
import { Request, Url } from "postman-collection";
import * as _ from "lodash";
export interface PathData {
    key: string;
    path: string;
    method: OpenAPIV3.HttpMethods;
    operationData: OpenAPI.Operation;
}

interface BodyRefAndType {
    type: string;
    ref: string;
}

function getRefObject(ref: string, schema: OpenAPI.Document, seen: Record<string, boolean> = {}) {
    if (typeof ref !== "string") {
        return {};
    }
    if (seen[ref]) {
        console.error(`Error: "${ref}" contains circular references in it.`);
        return {};
    }
    const savedSchema = ref
        .split("/")
        .slice(1)
        .map((elem) => {
            // https://swagger.io/docs/specification/using-ref#escape
            // since / is the default delimiter, slashes are escaped with ~1
            return decodeURIComponent(elem.replace(/~1/g, "/").replace(/~0/g, "~"));
        });

    if (savedSchema.length < 2) {
        console.warn(`ref ${ref} not found.`);
        return {};
    }

    if (savedSchema[0] !== "components" && savedSchema[0] !== "paths" && savedSchema[0] !== "definitions") {
        return {};
    }
    const refObj = _.get(schema, savedSchema);

    if (!refObj) {
        return {};
    }

    seen[ref] = true;
    if (refObj.$ref) {
        return getRefObject(refObj.$ref, schema, seen);
    }
    seen[ref] = false;
    return refObj;
}

function getV2BodyRef(operationData: OpenAPIV2.OperationObject): BodyRefAndType[] {
    const { consumes = [], parameters = [] } = operationData;

    if (consumes.length) {
        if (consumes[0] === "multipart/form-data") {
            return [];
        } else if (consumes[0] === "application/json") {
            return parameters
                ?.filter((p) => {
                    const param = p as OpenAPIV2.InBodyParameterObject;
                    return param.in === "body";
                })
                .map((p) => {
                    const param = p as OpenAPIV2.InBodyParameterObject;
                    return {
                        type: "application/json",
                        ref: param.schema.$ref || "",
                    };
                });
        } else {
            return [];
        }
    }
    return [];
}

function getBodyRef(data: PathData): BodyRefAndType[] {
    const opsDataV3 = data.operationData as OpenAPIV3.OperationObject;
    const opsDataV2 = data.operationData as OpenAPIV2.OperationObject;

    const reqBody = opsDataV3.requestBody as OpenAPIV3.RequestBodyObject;

    const refs = reqBody?.content
        ? Object.entries(reqBody.content).map((ent) => {
              const schema = ent[1].schema as OpenAPIV3.ReferenceObject;
              return {
                  type: ent[0],
                  ref: schema.$ref,
              };
          })
        : getV2BodyRef(opsDataV2);
    return refs;
}

function resolveRef(refs: BodyRefAndType[], schema: OpenAPI.Document) {
    return refs.map((ref) => {
        return getRefObject(ref.ref, schema);
    });
}

export function transformOpenApiRequestToPostman(data: PathData, schema: OpenAPI.Document) {
    const v3schema = schema as OpenAPIV3.Document;
    const v2schema = schema as OpenAPIV2.Document;

    const body = getBodyRef(data);

    const refs = resolveRef(body, schema);

    const url = schema
        ? v3schema.servers
            ? v3schema.servers[0].url + data.path
            : new Url({
                  path: v2schema.basePath + data.path,
                  host: v2schema?.host,
                  protocol: v2schema.schemes ? v2schema.schemes[0] : "http",
              })
        : data.path;
    const req = new Request({ url, method: data.method });
    // if (Array.isArray(data.operationData.parameters) && data.operationData.parameters.length) {
    //     const body = data.operationData.parameters.find((o) => );
    // }

    if (body.length) {
        req.addHeader({
            key: "Content-Type",
            value: body[0].type,
        });
    }

    return req;
}
