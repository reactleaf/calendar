import { DisabledDatesExample } from '@/components/doc-examples/DisabledDatesExample'
import { LocaleWeekStartExample } from '@/components/doc-examples/LocaleWeekStartExample'
import { MinMaxDatesExample } from '@/components/doc-examples/MinMaxDatesExample'
import { ModalInputExample } from '@/components/doc-examples/ModalInputExample'
import { MultipleMaxSelectionsExample } from '@/components/doc-examples/MultipleMaxSelectionsExample'
import { MultipleModeExample } from '@/components/doc-examples/MultipleModeExample'
import { RangeModeExample } from '@/components/doc-examples/RangeModeExample'
import { RangeTimeExample } from '@/components/doc-examples/RangeTimeExample'
import { SingleModeExample } from '@/components/doc-examples/SingleModeExample'
import { SingleTimeExample } from '@/components/doc-examples/SingleTimeExample'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'

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
    ModalInputExample,
    LocaleWeekStartExample,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
