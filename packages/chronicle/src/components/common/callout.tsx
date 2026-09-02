'use client'

import React from 'react'
import { Callout } from '@raystack/apsara'
import styles from './callout.module.css'

function CalloutContainer(props: React.ComponentProps<typeof Callout>) {
  return <Callout variant="outline" className={styles.callout} {...props} />
}

function CalloutTitle({ children }: { children: React.ReactNode }) {
  return <strong>{children}</strong>
}

function CalloutDescription({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function MdxBlockquote(props: React.ComponentProps<'blockquote'>) {
  return (
    <Callout type="grey" variant="outline" className={styles.callout}>
      {props.children}
    </Callout>
  )
}

export { Callout, CalloutContainer, CalloutTitle, CalloutDescription, MdxBlockquote }
