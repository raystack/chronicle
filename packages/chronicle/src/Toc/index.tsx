import React from "react";
import styles from "./styles.module.css";
import clsx from "clsx";

interface TocLink {
    label: string;
    href: string;
    level?: number;
}

interface TocProps {
    items: TocLink[];
    active?: string;
    label?: string;
    className?: string;
}

interface TocItemProps {
    item: TocLink;
    isActive: boolean;
}

const defaultLabel = "On This Page";

function TocItem({ item, isActive }: TocItemProps) {
    const marginLeft = (item.level || 0) * 8 + "px";
    const fontWeight = isActive ? "bold" : "normal";
    return (
        <a href={item.href} style={{ marginLeft, fontWeight }} className={styles.TocLink}>
            {item.label}
        </a>
    );
}

export function Root({ items, label, active, className }: TocProps) {
    return (
        <nav className={clsx(styles.TocWrapper, className)}>
            <header>
                <h3 className={styles.TocWrapperHeading}>{label || defaultLabel}</h3>
            </header>
            <ul className={styles.TocLinksList}>
                {items.map((item) => (
                    <TocItem item={item} key={item.href} isActive={item.href === active} />
                ))}
            </ul>
        </nav>
    );
}
