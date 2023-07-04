import { OpenAPIV3 } from "openapi-types";
import { Request, RequestBody } from "postman-collection";
import * as _ from "lodash";
export interface PathData {
    path: string;
    method: OpenAPIV3.HttpMethods;
    operationData: OpenAPIV3.OperationObject;
}

interface BodyRefAndType {
    type: string;
    ref: string;
}

function getRefObject(ref: string, schema: OpenAPIV3.Document, seen: Record<string, boolean> = {}) {
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

    if (savedSchema.length < 3) {
        console.warn(`ref ${ref} not found.`);
        return {};
    }

    if (savedSchema[0] !== "components" && savedSchema[0] !== "paths") {
        return {};
    }
    const refObj = _.get(schema, savedSchema);

    if (!refObj) {
        return {};
    }

    seen[ref] = true;

    if (_.has(refObj, "properties")) {
        Object.keys(refObj.properties).forEach((key) => {
            if (_.has(refObj.properties[key], "$ref")) {
                refObj.properties[key] = getRefObject(refObj.properties[key].$ref, schema, seen);
            } else if (_.has(refObj, ["properties", key, "items", "$ref"])) {
                refObj.properties[key].items = getRefObject(refObj.properties[key].items.$ref, schema, seen);
            }
        });
    }

    seen[ref] = false;
    return refObj;
}

function getBodyRef(data: PathData): BodyRefAndType[] {
    const reqBody = data.operationData.requestBody as OpenAPIV3.RequestBodyObject;

    const refs = reqBody?.content
        ? Object.entries(reqBody.content).map((ent) => {
              const schema = ent[1].schema as OpenAPIV3.ReferenceObject;
              return {
                  type: ent[0],
                  ref: schema.$ref,
              };
          })
        : [];
    return refs;
}

function resolveRef(refs: BodyRefAndType[], schema: OpenAPIV3.Document) {
    return refs.map((ref) => {
        return getRefObject(ref.ref, schema);
    });
}

function getExampleBody(ref: any): any {
    if (ref.type === "object") {
        const properties = ref.properties || {};
        return Object.keys(properties).reduce((acc, key) => {
            acc[key] = getExampleBody(properties[key]);
            return acc;
        }, {} as any);
    } else if (ref.type === "array") {
        const items = ref.items || {};
        return [getExampleBody(items)];
    } else if (ref.type === "string") {
        const example = ref.example || "randomString";
        return example;
    } else if (ref.type === "integer") {
        const example = ref.example || 0;
        return example;
    } else if (_.has(ref, ["example"])) {
        return ref.example;
    }
    return {};
}

export function transformOpenApiRequestToPostman(data: PathData, schema: OpenAPIV3.Document) {
    const body = getBodyRef(data).filter((b) => b.type === "application/json");
    const refs = resolveRef(body, schema);
    const bodies = refs.map((ref) => getExampleBody(ref));
    const queryParams =
        data.operationData.parameters?.filter((param) => (param as OpenAPIV3.ParameterObject).in === "query") || [];

    const headerParams =
        data.operationData.parameters?.filter((param) => (param as OpenAPIV3.ParameterObject).in === "header") || [];

    const url = schema.servers?.length ? schema.servers[0].url + data.path : data.path;
    const req = new Request({ url, method: data.method });

    if (body.length) {
        req.addHeader({
            key: "Content-Type",
            value: "application/json",
        });

        req.body = new RequestBody({
            mode: "raw",
            raw: JSON.stringify(bodies[0]),
        });
    }

    if (queryParams.length) {
        req.addQueryParams(
            queryParams.map((q) => {
                const query = q as OpenAPIV3.ParameterObject;
                return {
                    key: query.name,
                    value: "test",
                };
            }),
        );
    }

    if (headerParams.length) {
        headerParams.forEach((param) => {
            const header = param as OpenAPIV3.ParameterObject;
            req.addHeader({
                key: header.name,
                value: "",
            });
        });
    }

    return req;
}
