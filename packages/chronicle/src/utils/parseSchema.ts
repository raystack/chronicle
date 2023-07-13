import jsYaml from "js-yaml";
import { OpenAPIV3 } from "openapi-types";
import SwaggerParser from "@apidevtools/swagger-parser";
import * as _ from "lodash";

export const parseSchema = async (schema: string, fileType = "json") => {
    const schemaObj: OpenAPIV3.Document = fileType === "json" ? JSON.parse(schema) : jsYaml.load(schema);
    const parsedSchemaObj = (await SwaggerParser.parse(schemaObj, {
        resolve: { file: true, external: true, http: true },
        dereference: { circular: true },
        parse: {
            json: true,
            yaml: true,
            text: true,
        },
    })) as OpenAPIV3.Document;
    return parsedSchemaObj;
};

interface PathData {
    key: string;
    path: string;
    method: OpenAPIV3.HttpMethods;
    data: OpenAPIV3.OperationObject;
}

export const getApiPaths = (schema: OpenAPIV3.Document) => {
    const paths: PathData[] = [];
    for (const path in schema?.paths) {
        const methodsMap = schema?.paths[path];
        for (const method in methodsMap) {
            paths.push({
                key: `${method}-${path}`,
                path: path,
                method: method as OpenAPIV3.HttpMethods,
                data: _.get(methodsMap, method),
            });
        }
    }
    return paths;
};
