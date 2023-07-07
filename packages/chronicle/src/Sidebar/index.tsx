import React, { ReactElement, useState } from "react";
import styles from "./styles.module.css";
import * as _ from "lodash";

interface LinkItem {
    href?: string;
    label: string;
    external?: boolean;
}

interface GroupItem {
    label: string;
    items: SidebarItem[];
}

export type SidebarItem = LinkItem | GroupItem;

interface SidebarProps {
    items: SidebarItem[];
    itemComponent?: ReactElement;
}

interface MenuListProps {
    items: SidebarItem[];
    level?: number;
    itemComponent?: ReactElement;
}

function MenuList({ items, level = 0, itemComponent = <a /> }: MenuListProps) {
    const paddingLeft = level * 8 + "px";

    const ItemComponent = ({ item }: { item: LinkItem }) => {
        const href = item.href || "#";
        return React.cloneElement(itemComponent, { children: item.label, href: href, className: styles.sidebarItem });
    };

    return (
        <div className={styles.itemList} style={{ paddingLeft }}>
            {items.map((item) =>
                _.has(item, "items") ? (
                    <SubMenu subMenu={item as GroupItem} key={item.label} />
                ) : (
                    <ItemComponent key={item.label} item={item as LinkItem} />
                ),
            )}
        </div>
    );
}

function SubMenu({ subMenu, level = 0 }: { subMenu: GroupItem; level?: number }) {
    const [showMenu, setShowMenu] = useState(false);
    const toggleMenu = () => {
        setShowMenu((prev) => !prev);
    };
    return (
        <div>
            <div onClick={toggleMenu}>
                <span className={styles.subMenuTitle}>{subMenu.label}</span>
            </div>
            {showMenu ? <MenuList items={subMenu.items} level={level + 1} /> : null}
        </div>
    );
}

export function Root({ items, itemComponent = <a /> }: SidebarProps) {
    return (
        <aside className={styles.Sidebar}>
            <MenuList items={items} itemComponent={itemComponent} />
        </aside>
    );
}
