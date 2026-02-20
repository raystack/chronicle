import { Flex, Link, Text } from "@raystack/apsara";
import type { FooterConfig } from "@/types";
import styles from "./footer.module.css";

interface FooterProps {
  config?: FooterConfig;
}

export function Footer({ config }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <Flex align="center" justify="between" className={styles.container}>
        {config?.copyright && (
          <Text size={2} className={styles.copyright}>
            {config.copyright}
          </Text>
        )}
        {config?.links && config.links.length > 0 && (
          <Flex gap="medium" className={styles.links}>
            {config.links.map((link) => (
              <Link key={link.href} href={link.href} className={styles.link}>
                {link.label}
              </Link>
            ))}
          </Flex>
        )}
      </Flex>
    </footer>
  );
}
