import "@/styles/globals.css";
import type { AppProps } from "next/app";
import "@raystack/chronicle/dist/index.css";

export default function App({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />;
}
