import React from "react";
import styles from "./styles.module.css";
import { type ItemDefinition } from "postman-collection";

interface ApiInfoProps {
    api: ItemDefinition;
}

export default function ApiInfo({ api }: ApiInfoProps) {
    const description =
        typeof api.request?.description === "string" ? api.request?.description : api.request?.description?.content;
    const title = api.name;
    return (
        <div className={styles.apiInfoSection}>
            <div className={styles.title}>{title}</div>
            <div className={styles.description}>{description}</div>
        </div>
    );
}
