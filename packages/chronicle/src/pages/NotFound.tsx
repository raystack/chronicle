import { Flex, Headline, Text } from '@raystack/apsara'

export function NotFound() {
  return (
    <Flex direction="column" align="center" justify="center" style={{ minHeight: '60vh' }}>
      <Headline size="large" as="h1">404</Headline>
      <Text size={3}>Page not found</Text>
    </Flex>
  )
}
