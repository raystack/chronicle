import "@/styles/globals.css";
import type { AppProps } from "next/app";
import "@raystack/chronicle/client/style.css";

export default function App({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />;
}
