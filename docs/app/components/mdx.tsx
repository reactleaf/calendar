import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { MultipleModeExample } from '@/components/doc-examples/MultipleModeExample'
import { RangeModeExample } from '@/components/doc-examples/RangeModeExample'
import { SingleModeExample } from '@/components/doc-examples/SingleModeExample'

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    SingleModeExample,
    MultipleModeExample,
    RangeModeExample,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
