import * as React from 'react'
import { shallow, ShallowWrapper } from 'enzyme'
import { ChangesTreeList, IChangesTreeListProps } from '../../../../src/ui/changes/changes-tree-list'
import { WorkingDirectoryFileChange, WorkingDirectoryStatus, AppFileStatusKind } from '../../../../src/models/status'
import { DiffSelection, DiffSelectionType } from '../../../../src/models/diff'
import { Repository } from '../../../../src/models/repository'
import { Dispatcher } from '../../../../src/ui/dispatcher'
import { ChangedFile } from '../../../../src/ui/changes/changed-file'

// Helper to create default props
function createDefaultProps(overrideProps: Partial<IChangesTreeListProps> = {}): IChangesTreeListProps {
  const files = [
    new WorkingDirectoryFileChange('file.txt', { kind: AppFileStatusKind.Modified }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
    new WorkingDirectoryFileChange('path/to/file2.ts', { kind: AppFileStatusKind.New }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
    new WorkingDirectoryFileChange('path/file3.md', { kind: AppFileStatusKind.Modified }, DiffSelection.fromInitialSelection(DiffSelectionType.None)),
    new WorkingDirectoryFileChange('another/path/file4.js', { kind: AppFileStatusKind.Deleted }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
  ]
  const workingDirectory = WorkingDirectoryStatus.fromFiles(files)

  return {
    repository: {} as Repository,
    workingDirectory,
    selectedFileIDs: [],
    onIncludeChanged: jest.fn(),
    availableWidth: 800,
    onOpenItemInExternalEditor: jest.fn(),
    dispatcher: {
      selectWorkingDirectoryFiles: jest.fn(),
      // Add any other dispatcher methods used by ChangesTreeList
    } as any as Dispatcher,
    onFileSelectionChanged: jest.fn(), // Though not strictly used by tree for its own updates, it's in props
    ...overrideProps,
  }
}

describe('ChangesTreeList', () => {
  describe('buildTree', () => {
    it('correctly builds a tree from a flat list of files', () => {
      const props = createDefaultProps()
      // Access private method for testing - not ideal, but common for complex internal logic.
      // Alternatively, test via output of render if structure is verifiable.
      const instance = shallow(<ChangesTreeList {...props} />).instance() as ChangesTreeList
      const tree = (instance as any).buildTree(props.workingDirectory.files)

      expect(tree).toHaveLength(3) // 'file.txt', 'path', 'another'
      expect(tree[0].name).toBe('file.txt')
      expect(tree[0].kind).toBe('file')
      expect(tree[1].name).toBe('path')
      expect(tree[1].kind).toBe('folder')
      expect(tree[1].children).toHaveLength(2)
      expect(tree[1].children[0].name).toBe('to')
      expect(tree[1].children[0].kind).toBe('folder')
      expect(tree[1].children[0].children).toHaveLength(1)
      expect(tree[1].children[0].children[0].name).toBe('file2.ts')
      expect(tree[1].children[0].children[0].kind).toBe('file')
      expect(tree[1].children[1].name).toBe('file3.md')
      expect(tree[1].children[1].kind).toBe('file')
    })

    it('handles empty file list', () => {
      const props = createDefaultProps({ workingDirectory: WorkingDirectoryStatus.fromFiles([]) })
      const instance = shallow(<ChangesTreeList {...props} />).instance() as ChangesTreeList
      const tree = (instance as any).buildTree(props.workingDirectory.files)
      expect(tree).toHaveLength(0)
    })
  })

  describe('rendering', () => {
    it('renders correct number of ChangedFile components for top-level files', () => {
      const files = [
        new WorkingDirectoryFileChange('file1.txt', { kind: AppFileStatusKind.Modified }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
        new WorkingDirectoryFileChange('file2.txt', { kind: AppFileStatusKind.New }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
      ]
      const props = createDefaultProps({ workingDirectory: WorkingDirectoryStatus.fromFiles(files) })
      const wrapper = shallow(<ChangesTreeList {...props} />)
      expect(wrapper.find(ChangedFile)).toHaveLength(2)
    })

    it('renders files inside an expanded folder', () => {
      const files = [
        new WorkingDirectoryFileChange('folder/file1.txt', { kind: AppFileStatusKind.Modified }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
      ]
      const props = createDefaultProps({ workingDirectory: WorkingDirectoryStatus.fromFiles(files) })
      const wrapper = shallow(<ChangesTreeList {...props} />)

      // Expand the folder 'folder'
      wrapper.setState({ expandedNodes: new Set(['folder']) })
      wrapper.update() // Ensure re-render

      expect(wrapper.find(ChangedFile)).toHaveLength(1)
      expect(wrapper.find(ChangedFile).prop('file').path).toBe('folder/file1.txt')
    })

    it('does not render files inside a collapsed folder', () => {
      const files = [
        new WorkingDirectoryFileChange('folder/file1.txt', { kind: AppFileStatusKind.Modified }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
      ]
      const props = createDefaultProps({ workingDirectory: WorkingDirectoryStatus.fromFiles(files) })
      const wrapper = shallow(<ChangesTreeList {...props} />)

      // Ensure folder 'folder' is collapsed (default state)
      wrapper.setState({ expandedNodes: new Set() })
      wrapper.update()

      expect(wrapper.find(ChangedFile)).toHaveLength(0)
    })
  })

  describe('folder expansion', () => {
    it('toggles folder expansion state when a folder row is clicked', () => {
      const files = [
        new WorkingDirectoryFileChange('folder/file.txt', { kind: AppFileStatusKind.Modified }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
      ]
      const props = createDefaultProps({ workingDirectory: WorkingDirectoryStatus.fromFiles(files) })
      const wrapper = shallow(<ChangesTreeList {...props} />)

      // Find the div representing the folder row. This assumes 'folder' is the key/id.
      // A more robust selector (e.g., a specific class or test ID) would be better.
      const folderNodeWrapper = wrapper.findWhere(n => n.type() === 'div' && n.key() === 'folder');
      expect(folderNodeWrapper.exists()).toBe(true)

      folderNodeWrapper.simulate('click')
      expect(wrapper.state('expandedNodes')).toContain('folder')

      folderNodeWrapper.simulate('click')
      expect(wrapper.state('expandedNodes')).not.toContain('folder')
    })
  })

  // Future tests:
  // - File selection (single, ctrl/meta, shift) - will need to mock dispatcher and check calls.
  // - File inclusion (checkbox clicks) - mock onIncludeChanged and check calls.
  // - Focus and selection styling application.
})
