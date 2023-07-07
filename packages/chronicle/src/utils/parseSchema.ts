import jsYaml from "js-yaml";
import { OpenAPIV3 } from "openapi-types";
import SwaggerParser from "@apidevtools/swagger-parser";

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
