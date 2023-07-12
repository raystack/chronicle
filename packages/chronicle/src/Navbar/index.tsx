import React, { ReactNode } from "react";
import styles from "./styles.module.css";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { CaretDownIcon } from "@radix-ui/react-icons";
import clsx from "clsx";

interface NavbarProps {
    logo?: ReactNode | string;
    leftActionItems?: ReactNode[];
    rightActionItems?: ReactNode[];
    className?: string;
}

interface MenuProps {
    label: string;
    items: ReactNode[];
    menuPosition?: "left" | "right";
}

export function Menu({ label, items, menuPosition }: MenuProps) {
    const contentStyle = menuPosition === "right" ? { right: 0 } : { left: 0 };
    return (
        <div className={styles.List}>
            <NavigationMenu.Trigger className={styles.NavigationMenuTrigger}>
                {label} <CaretDownIcon className="CaretDown" aria-hidden />
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className={styles.NavigationMenuContent} forceMount style={contentStyle}>
                <ul className={styles.NavigationMenuContentList}>
                    {items?.map((item, i) => (
                        <NavigationMenu.Item key={i} className={styles.NavigationMenuContentListItem}>
                            {item}
                        </NavigationMenu.Item>
                    ))}
                </ul>
            </NavigationMenu.Content>
        </div>
    );
}

export function Root({ logo, leftActionItems = [], rightActionItems = [], className }: NavbarProps) {
    return (
        <header className={clsx(styles.Navbar, className)}>
            <div style={{ display: "flex" }}>
                <div className={styles.Logo}>{logo}</div>
                <NavigationMenu.Root>
                    <ul>
                        {leftActionItems?.map((item, i) => (
                            <NavigationMenu.Item key={i} className={styles.ActionItem}>
                                {item}
                            </NavigationMenu.Item>
                        ))}
                    </ul>
                </NavigationMenu.Root>
            </div>
            <NavigationMenu.Root>
                <ul>
                    {rightActionItems?.map((item, i) => (
                        <NavigationMenu.Item key={i} className={styles.ActionItem}>
                            {item}
                        </NavigationMenu.Item>
                    ))}
                </ul>
            </NavigationMenu.Root>
        </header>
    );
}
