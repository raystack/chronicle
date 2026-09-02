import { describe, expect, test } from 'bun:test';
import type { Element, ElementContent, Root } from 'hast';
import rehypeTableColumns from './rehype-table-columns';

function cell(tagName: 'th' | 'td', value: string): Element {
  return { type: 'element', tagName, properties: {}, children: [{ type: 'text', value }] };
}

function row(tagName: 'th' | 'td', values: string[]): Element {
  return {
    type: 'element',
    tagName: 'tr',
    properties: {},
    children: values.map(value => cell(tagName, value)),
  };
}

/** A markdown table as rehype sees it: one `thead` row, then the body. */
function table(headers: string[], body: string[][]): Element {
  return {
    type: 'element',
    tagName: 'table',
    properties: {},
    children: [
      { type: 'element', tagName: 'thead', properties: {}, children: [row('th', headers)] },
      {
        type: 'element',
        tagName: 'tbody',
        properties: {},
        children: body.map(values => row('td', values)),
      },
    ],
  };
}

function run(node: Element): Element {
  const tree: Root = { type: 'root', children: [node] };
  const transform = rehypeTableColumns.call({ use: () => undefined } as never) as (
    tree: Root
  ) => void;
  transform(tree);
  return tree.children[0] as Element;
}

/** The size class of each column, reading the header row. `null` is the prose column. */
function classes(node: Element): Array<string | null> {
  const thead = node.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'thead'
  );
  const headerRow = thead?.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'tr'
  );
  return (headerRow?.children ?? [])
    .filter((child): child is Element => child.type === 'element')
    .map(th => (th.properties['data-col'] as string) ?? null);
}

/** Which column carries `data-grow`, reading the header row. */
function growColumn(node: Element): number {
  const thead = node.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'thead'
  );
  const headerRow = thead?.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'tr'
  );
  return (headerRow?.children ?? [])
    .filter((child): child is Element => child.type === 'element')
    .findIndex(th => th.properties['data-grow'] != null);
}

/** The cells of the first body row, as text with `|` marking each break opportunity. */
function bodyParts(node: Element): string[] {
  const tbody = node.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'tbody'
  );
  const firstRow = tbody?.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'tr'
  );
  return (firstRow?.children ?? [])
    .filter((child): child is Element => child.type === 'element')
    .map(flatten);
}

/** Text with `|` for each break opportunity, however deeply the markup nests. */
function flatten(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type !== 'element') return '';
  if (node.tagName === 'wbr') return '|';
  return node.children.map(flatten).join('');
}

const prose = (length: number) => 'x'.repeat(length);

describe('rehypeTableColumns', () => {
  test('states widths for a conformance table: one prose column, the rest labels', () => {
    const result = run(
      table(['Item', 'Description', 'Reference', 'Status', 'Support', 'Notes'], [
        ['SPP-14', 'Space Packet', '4.1', 'M', 'Yes', prose(400)],
        ['SPP-15', 'Packet Primary Header', '4.1.3', 'M', 'Yes', prose(350)],
      ])
    );

    expect(result.properties['data-fit']).toBe('stated');
    // Sized by the longest run rather than the longest cell: "Packet Primary
    // Header" is 21 characters but wraps at its spaces, so the column only has
    // to fit "Description" in the heading above it.
    expect(classes(result)).toEqual(['xs', 's', 's', 'xs', 'xs', null]);
  });

  test('leaves a field-and-value pair alone: one label column needs no stated width', () => {
    const result = run(
      table(['Field', 'Value'], [
        ['Implementation Name', 'astro/pkg/spp'],
        ['Other Information', prose(200)],
      ])
    );

    expect(result.properties['data-fit']).toBeUndefined();
    expect(classes(result)).toEqual([null, null]);
  });

  test('leaves a table with no prose column alone', () => {
    const result = run(
      table(['Category', 'Total', 'Supported'], [
        ['Mandatory', '31', '31'],
        ['Optional', '12', '9'],
      ])
    );

    expect(result.properties['data-fit']).toBeUndefined();
  });

  test('leaves a table with a second prose column alone', () => {
    const result = run(
      table(['Requirement', 'Reference', 'Why it is not checked'], [
        [prose(200), '4.1.4', prose(300)],
        [prose(180), '4.1.5', prose(250)],
      ])
    );

    expect(result.properties['data-fit']).toBeUndefined();
  });

  test('a long label column is still a label column', () => {
    const result = run(
      table(['Item', 'Description', 'Notes'], [
        ['TM-1', prose(88), prose(333)],
        ['TM-2', prose(60), prose(300)],
      ])
    );

    expect(result.properties['data-fit']).toBe('stated');
    expect(classes(result)).toEqual(['xs', 'xl', null]);
  });

  test('a runaway cell in a label column makes it a second prose column', () => {
    // One 156-character entry is enough: the column could need a paragraph's
    // room, so the table is left to size itself rather than have that room
    // taken from the Notes column beside it.
    const result = run(
      table(['Item', 'Description', 'Notes'], [
        ['TM-1', prose(156), prose(130)],
        ['TM-2', 'short', prose(125)],
      ])
    );

    expect(result.properties['data-fit']).toBeUndefined();
  });

  test('the prose column can sit in the middle of a table', () => {
    // The last column here is a flag; the paragraphs are in column four.
    const result = run(
      table(['Item', 'Description', 'Reference', 'Notes', 'Status'], [
        ['TM-1', prose(90), '4.1.4', prose(349), 'Yes'],
        ['TM-2', prose(60), '4.1.5', prose(200), 'No'],
      ])
    );

    expect(result.properties['data-fit']).toBe('stated');
    expect(classes(result)).toEqual(['xs', 'xl', 's', null, 'xs']);
  });

  test('a header counts towards the width a column must fit', () => {
    // Every value is one character, but "Support" is seven, so the column is
    // sized for the heading rather than collapsing under it.
    const result = run(
      table(['Item', 'Support', 'Notes'], [
        ['A', 'M', prose(200)],
        ['B', 'C', prose(180)],
      ])
    );

    expect(classes(result)).toEqual(['xs', 'xs', null]);
  });

  test('sizes a column to fit its longest word, so no word has to break', () => {
    // "Unsupported" is eleven characters with nothing to break at. Sizing this
    // column by its longest cell put it in a class that fits nine, and the word
    // came out as "Unsupporte" above a stray "d".
    const result = run(
      table(['Item', 'Status', 'Notes'], [
        ['XT-1', 'Unsupported', prose(300)],
        ['XT-2', 'Ignored', prose(280)],
      ])
    );

    expect(classes(result)[1]).toBe('m');
  });

  test('a hyphen already breaks, so it does not widen a column', () => {
    // "SPP-14" is six characters but CSS may break after the hyphen, so the
    // column only has to fit "SPP-".
    const result = run(
      table(['Item', 'Ref', 'Notes'], [
        ['SPP-14', '4.1', prose(300)],
        ['SPP-15', '4.2', prose(280)],
      ])
    );

    expect(classes(result)[0]).toBe('xs');
  });

  test('a run too long for any class takes the widest rather than giving up', () => {
    // Falling back to automatic layout here would hide the end of every line
    // off the sheet, which is worse than one broken word.
    const result = run(
      table(['Item', 'Description', 'Notes'], [
        ['A', 'Averyveryverylongunbrokenidentifier', prose(300)],
        ['B', 'short', prose(280)],
      ])
    );

    expect(result.properties['data-fit']).toBe('stated');
    expect(classes(result)[1]).toBe('xl');
  });

  test('breaks a long label at its punctuation, not mid-word', () => {
    const result = run(
      table(['Item', 'Description', 'Notes'], [
        ['SPP-10', 'Octet_String.indication', prose(300)],
        ['SPP-11', 'Packet.request', prose(280)],
      ])
    );

    expect(bodyParts(result)[1]).toBe('Octet_|String.|indication');
  });

  test('leaves short labels whole, so a clause reference keeps its dots', () => {
    const result = run(
      table(['Item', 'Reference', 'Support', 'Notes'], [
        ['SPP-10', '4.1.3.3.3.4', 'Yes', prose(300)],
        ['SPP-11', '4.1.4', 'Yes', prose(280)],
      ])
    );

    expect(bodyParts(result)[1]).toBe('4.1.3.3.3.4');
  });

  test('seams the prose column too, since its width is only the remainder', () => {
    const result = run(
      table(['Item', 'Description', 'Notes'], [
        ['SPP-10', 'short', `${prose(300)} Service.ReceivePacketIndication()`],
        ['SPP-11', 'short', prose(280)],
      ])
    );

    expect(bodyParts(result)[2]).toContain('Service.|Receive|Packet|Indication()');
  });

  test('breaks an identifier at its capitals when it has no punctuation', () => {
    // `TransmissionConstraintList` has nothing else to break at. Left whole it
    // overflowed its cell, and the cells are clipped with an ellipsis, so the
    // end of the name simply disappeared.
    const result = run(
      table(['Element', 'Status', 'Notes'], [
        ['TransmissionConstraintList', 'Unsupported', prose(300)],
        ['VerifierSet', 'Unsupported', prose(280)],
      ])
    );

    expect(bodyParts(result)[0]).toBe('Transmission|Constraint|List');
    // Sized for its longest part now, not the whole name.
    expect(classes(result)[0]).toBe('m');
  });

  test('adds nothing to a table it does not mark up', () => {
    const result = run(
      table(['Field', 'Value'], [['Implementation.Name.Long', prose(200)]])
    );

    expect(bodyParts(result)[0]).toBe('Implementation.Name.Long');
  });

  test('breaks a long label inside markup, such as an inline code span', () => {
    const node = table(['Item', 'Description', 'Notes'], [
      ['SPP-10', 'placeholder', prose(300)],
    ]);
    const tbody = node.children[1] as Element;
    const row = (tbody.children[0] as Element).children as Element[];
    row[1].children = [
      { type: 'element', tagName: 'code', properties: {}, children: [
        { type: 'text', value: 'Service.SendPacket' },
      ] },
    ];

    expect(bodyParts(run(node))[1]).toBe('Service.|Send|Packet');
  });

  test('marks the label column holding the most text as the one to grow', () => {
    const result = run(
      table(['Item', 'Description', 'Reference', 'Status', 'Notes'], [
        ['SPP-1', 'Space Packet Service Data Unit', '3.2.2', 'M', prose(300)],
        ['SPP-2', 'Octet String SDU', '3.2.3', 'M', prose(280)],
      ])
    );

    // Description, not the item code beside it nor the clause reference.
    expect(growColumn(result)).toBe(1);
  });

  test('never marks the prose column to grow', () => {
    const result = run(
      table(['Item', 'Description', 'Notes'], [
        ['A', 'short', prose(600)],
        ['B', 'short', prose(500)],
      ])
    );

    const grow = growColumn(result);
    expect(grow).not.toBe(2);
    expect(classes(result)[grow]).not.toBeNull();
  });

  test('marks exactly one column to grow', () => {
    const result = run(
      table(['Item', 'Description', 'Reference', 'Notes'], [
        ['A', 'Something long here', '3.2.2', prose(300)],
        ['B', 'Another long one', '3.2.3', prose(280)],
      ])
    );

    const marked = classes(result).filter((_, i) => growColumn(result) === i);
    expect(marked).toHaveLength(1);
  });

  test('ignores a table with a spanning cell', () => {
    const node = table(['Item', 'Description', 'Notes'], [['A', 'b', prose(200)]]);
    const tbody = node.children[1] as Element;
    const firstRow = tbody.children[0] as Element;
    (firstRow.children[0] as Element).properties.colSpan = 2;

    expect(run(node).properties['data-fit']).toBeUndefined();
  });

  test('ignores a table with no body rows', () => {
    expect(run(table(['Item', 'Notes'], [])).properties['data-fit']).toBeUndefined();
  });
});
