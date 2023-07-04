import { OpenAPIV3 } from "openapi-types";
import { Request } from "postman-collection";
import * as _ from "lodash";
export interface PathData {
    key: string;
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
    if (refObj.$ref) {
        return getRefObject(refObj.$ref, schema, seen);
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

export function transformOpenApiRequestToPostman(data: PathData, schema: OpenAPIV3.Document) {
    const body = getBodyRef(data);

    const refs = resolveRef(body, schema);

    const url = schema.servers?.length ? schema.servers[0].url + data.path : data.path;
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
