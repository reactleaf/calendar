import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { DisabledDatesExample } from '@/components/doc-examples/DisabledDatesExample'
import { LocaleWeekStartExample } from '@/components/doc-examples/LocaleWeekStartExample'
import { MessagesFormattersExample } from '@/components/doc-examples/MessagesFormattersExample'
import { MinMaxDatesExample } from '@/components/doc-examples/MinMaxDatesExample'
import { MultipleModeExample } from '@/components/doc-examples/MultipleModeExample'
import { MultipleMaxSelectionsExample } from '@/components/doc-examples/MultipleMaxSelectionsExample'
import { RangeModeExample } from '@/components/doc-examples/RangeModeExample'
import { RangeTimeExample } from '@/components/doc-examples/RangeTimeExample'
import { SingleModeExample } from '@/components/doc-examples/SingleModeExample'
import { SingleTimeExample } from '@/components/doc-examples/SingleTimeExample'

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    SingleModeExample,
    MultipleModeExample,
    RangeModeExample,
    SingleTimeExample,
    RangeTimeExample,
    MultipleMaxSelectionsExample,
    DisabledDatesExample,
    MinMaxDatesExample,
    LocaleWeekStartExample,
    MessagesFormattersExample,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
