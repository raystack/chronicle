import { type ItemDefinition, type ItemGroupDefinition } from "postman-collection";
import { useEffect, useState } from "react";

import { convert } from "openapi-to-postmanv2";
import { promisify } from "util";

const convertAsync = promisify(convert);

const getApiDefinitions = (items: Array<ItemDefinition | ItemGroupDefinition>): ItemDefinition[] => {
    let apis: ItemDefinition[] = [];
    items?.forEach((item) => {
        const itemDefinition = item as ItemDefinition;
        const itemGroupDefinition = item as ItemGroupDefinition;
        if (itemDefinition.request != null && itemDefinition.response != null) {
            apis.push(itemDefinition);
        } else if (itemGroupDefinition.item != null) {
            apis = apis.concat(getApiDefinitions(itemGroupDefinition.item));
        }
    });
    return apis;
};

export default function useApiDefinitions({ schema }: { schema: string }) {
    const [apiDefinitions, setApiDefinitions] = useState<ItemDefinition[]>([]);

    useEffect(() => {
        const parseApiDefinitions = async (): Promise<void> => {
            const type = "string";
            const postmanCollection = await convertAsync({ type, data: schema }, undefined);
            if (postmanCollection.result) {
                let apis: ItemDefinition[] = [];
                postmanCollection.output.forEach((collection) => {
                    if (collection.data.item != null) {
                        apis = apis.concat(getApiDefinitions(collection.data.item));
                    }
                });
                setApiDefinitions(apis);
            }
        };
        if (apiDefinitions.length < 1) {
            parseApiDefinitions();
        }
    }, [schema]);

    return apiDefinitions;
}
