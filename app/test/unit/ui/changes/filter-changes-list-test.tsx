import * as React from 'react'
import { shallow, ShallowWrapper } from 'enzyme'
import { FilterChangesList, IFilterChangesListProps } from '../../../../src/ui/changes/filter-changes-list'
import { WorkingDirectoryStatus, WorkingDirectoryFileChange, AppFileStatusKind } from '../../../../src/models/status'
import { DiffSelection, DiffSelectionType } from '../../../../src/models/diff'
import { Repository } from '../../../../src/models/repository'
import { Dispatcher } from '../../../../src/ui/dispatcher'
import { OcticonButton } from '../../../../src/ui/lib/octicon-button'
import * as octicons from '../../../../src/ui/octicons/octicons.generated'
import { Checkbox } from '../../../../src/ui/lib/checkbox' // Needed for the component to render

// Helper function to create default props
function createDefaultProps(overrideProps: Partial<IFilterChangesListProps> = {}): IFilterChangesListProps {
  const files = [
    new WorkingDirectoryFileChange('file1.txt', { kind: AppFileStatusKind.Modified }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
    new WorkingDirectoryFileChange('file2.ts', { kind: AppFileStatusKind.New }, DiffSelection.fromInitialSelection(DiffSelectionType.All)),
  ]
  const workingDirectory = WorkingDirectoryStatus.fromFiles(files)

  return {
    repository: {} as Repository, // Simplified
    workingDirectory,
    selectedFileIDs: [],
    onFileSelectionChanged: jest.fn(),
    onIncludeChanged: jest.fn(),
    onCreateCommit: jest.fn(),
    onDiscardChanges: jest.fn(),
    askForConfirmationOnDiscardChanges: false,
    askForConfirmationOnCommitFilteredChanges: false,
    focusCommitMessage: false,
    isShowingModal: false,
    isShowingFoldout: false,
    onDiscardChangesFromFiles: jest.fn(),
    onChangesListScrolled: jest.fn(),
    onOpenItem: jest.fn(),
    onOpenItemInExternalEditor: jest.fn(),
    branch: 'main',
    commitAuthor: null,
    dispatcher: { _setChangesListTreeViewVisible: jest.fn() } as any as Dispatcher, // Mock
    availableWidth: 500,
    isCommitting: false,
    isGeneratingCommitMessage: false,
    shouldShowGenerateCommitMessageCallOut: false,
    commitToAmend: null,
    currentBranchProtected: false,
    currentRepoRulesInfo: {
      rulesets: [],
      bypassMode: false,
      allRulesPass: true,
    },
    aheadBehind: null,
    commitMessage: { summary: '', description: null, coAuthors: [] },
    autocompletionProviders: [],
    onIgnoreFile: jest.fn(),
    onIgnorePattern: jest.fn(),
    showCoAuthoredBy: false,
    coAuthors: [],
    stashEntry: null,
    isShowingStashEntry: false,
    shouldNudgeToCommit: false,
    commitSpellcheckEnabled: true,
    showCommitLengthWarning: false,
    accounts: [],
    filterText: '',
    includedChangesInCommitFilter: false,
    showChangesFilter: true, // Ensure filter UI is rendered
    // New props for tree view
    changesListTreeViewVisible: false,
    onChangesListTreeViewVisibleChanged: jest.fn(),
    ...overrideProps,
  }
}

describe('FilterChangesList', () => {
  it('renders the tree view toggle button in the checkbox row', () => {
    const props = createDefaultProps()
    const wrapper = shallow(<FilterChangesList {...props} />)
    // The button is in the CheckboxRow, which is part of the custom filter row.
    // We need to find it within the structure rendered by renderCheckBoxRow.
    // A more robust approach would be a specific test ID or class on the button.
    const toggleButton = wrapper.find(OcticonButton)
    expect(toggleButton.exists()).toBe(true)
  })

  it('toggle button icon changes based on changesListTreeViewVisible prop (list view)', () => {
    const props = createDefaultProps({ changesListTreeViewVisible: false })
    const wrapper = shallow(<FilterChangesList {...props} />)
    const toggleButton = wrapper.find(OcticonButton) // Needs specific selector
    expect(toggleButton.prop('icon')).toBe(octicons.organization)
    expect(toggleButton.prop('ariaLabel')).toContain('Tree View')
  })

  it('toggle button icon changes based on changesListTreeViewVisible prop (tree view)', () => {
    const props = createDefaultProps({ changesListTreeViewVisible: true })
    const wrapper = shallow(<FilterChangesList {...props} />)
    const toggleButton = wrapper.find(OcticonButton) // Needs specific selector
    expect(toggleButton.prop('icon')).toBe(octicons.list)
    expect(toggleButton.prop('ariaLabel')).toContain('List View')
  })

  it('calls onChangesListTreeViewVisibleChanged when toggle button is clicked', () => {
    const onToggleMock = jest.fn()
    const props = createDefaultProps({ onChangesListTreeViewVisibleChanged: onToggleMock, changesListTreeViewVisible: false })
    const wrapper = shallow(<FilterChangesList {...props} />)
    const toggleButton = wrapper.find(OcticonButton) // Needs specific selector

    toggleButton.simulate('click')
    expect(onToggleMock).toHaveBeenCalledWith(true)
  })

  it('calls onChangesListTreeViewVisibleChanged when toggle button is clicked (when initially true)', () => {
    const onToggleMock = jest.fn()
    const props = createDefaultProps({ onChangesListTreeViewVisibleChanged: onToggleMock, changesListTreeViewVisible: true })
    const wrapper = shallow(<FilterChangesList {...props} />)
    const toggleButton = wrapper.find(OcticonButton) // Needs specific selector

    toggleButton.simulate('click')
    expect(onToggleMock).toHaveBeenCalledWith(false)
  })

  // Add more tests here for conditional rendering of flat list vs tree view
})
