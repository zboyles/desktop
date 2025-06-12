import * as React from 'react'
import { WorkingDirectoryFileChange, AppFileStatusKind } from '../../../models/status'
import { DiffSelectionType } from '../../../models/diff'
import { IChangesListProps } from './changes-list'
import { ChangedFile } from './changed-file'
import { Dispatcher } from '../../dispatcher' // Import Dispatcher

interface IChangesTreeListProps extends Pick<IChangesListProps, 'workingDirectory' | 'selectedFileIDs' | 'onFileSelectionChanged' | 'onIncludeChanged' | 'availableWidth' | 'onOpenItemInExternalEditor' | 'repository'> {
  dispatcher: Dispatcher
}

interface IChangesTreeListState {
  expandedNodes: Set<string>
  lastClickedFileID: string | null // Added for Shift-click
}

interface ITreeNode {
  id: string // Full path
  name: string // Basename or folder name
  path: string // Full path, same as id for now
  kind: 'file' | 'folder'
  file?: WorkingDirectoryFileChange
  children: ITreeNode[]
  depth: number
  status?: AppFileStatusKind // For file nodes
  include?: boolean | null     // For file nodes (and potentially folders later)
  selection?: DiffSelectionType // For file nodes
}

export class ChangesTreeList extends React.Component<IChangesTreeListProps, IChangesTreeListState> {
  constructor(props: IChangesTreeListProps) {
    super(props)
    this.state = {
      expandedNodes: new Set<string>(),
      lastClickedFileID: null, // Initialize lastClickedFileID
    }
  }

  private buildTree(files: ReadonlyArray<WorkingDirectoryFileChange>): ITreeNode[] {
    const root: ITreeNode = { id: '__root__', name: 'root', path: '', kind: 'folder', children: [], depth: -1 }
    const map = new Map<string, ITreeNode>()

    files.forEach(file => {
      let currentParent = root
      const pathParts = file.path.split('/')
      let currentPathAccumulator = ''

      pathParts.forEach((part, index) => {
        currentPathAccumulator = currentPathAccumulator ? `${currentPathAccumulator}/${part}` : part
        const isLastPart = index === pathParts.length - 1

        let node = map.get(currentPathAccumulator)

        if (!node) {
          node = {
            id: currentPathAccumulator,
            name: part,
            path: currentPathAccumulator,
            kind: isLastPart ? 'file' : 'folder',
            file: isLastPart ? file : undefined,
            children: [],
            depth: index,
            status: isLastPart ? file.status.kind : undefined,
            include: isLastPart ? (file.selection.getSelectionType() === DiffSelectionType.All ? true : (file.selection.getSelectionType() === DiffSelectionType.None ? false : null)) : undefined,
            selection: isLastPart ? file.selection.getSelectionType() : undefined,
          }
          map.set(currentPathAccumulator, node)
          currentParent.children.push(node)
        } else if (isLastPart && node.kind === 'folder' && node.file === undefined) {
          node.kind = 'file'
          node.file = file
          node.status = file.status.kind
          node.include = file.selection.getSelectionType() === DiffSelectionType.All ? true : (file.selection.getSelectionType() === DiffSelectionType.None ? false : null)
          node.selection = file.selection.getSelectionType()
        }
        currentParent = node! // Node is guaranteed to be defined here
      })
    })
    return root.children
  }

  private getVisibleFileNodesInOrder(nodesToTraverse: ITreeNode[]): ITreeNode[] {
    const visibleFiles: ITreeNode[] = []
    const recurse = (currentNodes: ITreeNode[]) => {
      for (const node of currentNodes) {
        if (node.kind === 'file' && node.file) {
          visibleFiles.push(node)
        }
        if (node.kind === 'folder' && node.children.length > 0 && this.state.expandedNodes.has(node.id)) {
          recurse(node.children)
        }
      }
    }
    recurse(nodesToTraverse)
    return visibleFiles
  }

  private toggleNode = (nodeId: string) => {
    this.setState(prevState => {
      const newExpandedNodes = new Set(prevState.expandedNodes)
      if (newExpandedNodes.has(nodeId)) {
        newExpandedNodes.delete(nodeId)
      } else {
        newExpandedNodes.add(nodeId)
      }
      return { expandedNodes: newExpandedNodes }
    })
  }

  private onIncludeChanged = (file: WorkingDirectoryFileChange, include: boolean) => {
    this.props.onIncludeChanged?.(file, include)
  }

  private onFileClicked = (file: WorkingDirectoryFileChange, event: React.MouseEvent<HTMLElement>) => {
    const { dispatcher, repository, workingDirectory, selectedFileIDs } = this.props
    const { lastClickedFileID } = this.state
    const isMetaOrCtrl = event.metaKey || event.ctrlKey
    const isShift = event.shiftKey

    if (isShift && lastClickedFileID && lastClickedFileID !== file.id) {
      const currentRootTreeNodes = this.buildTree(workingDirectory.files)
      const visibleFileNodes = this.getVisibleFileNodesInOrder(currentRootTreeNodes)
      const anchorIndex = visibleFileNodes.findIndex(node => node.file?.id === lastClickedFileID)
      const currentIndex = visibleFileNodes.findIndex(node => node.file?.id === file.id)

      if (anchorIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(anchorIndex, currentIndex)
        const end = Math.max(anchorIndex, currentIndex)
        const filesInRange = visibleFileNodes.slice(start, end + 1)
                                          .map(node => node.file)
                                          .filter(f => f !== undefined) as WorkingDirectoryFileChange[]

        dispatcher.selectWorkingDirectoryFiles(repository, filesInRange)
        // Do not update lastClickedFileID on shift-click; the anchor remains the same.
      } else {
        // Fallback if anchor/current not found in visible nodes (should not happen ideally)
        dispatcher.selectWorkingDirectoryFiles(repository, [file])
        this.setState({ lastClickedFileID: file.id })
      }
    } else if (isMetaOrCtrl) {
      const newSelectedFileIDsSet = new Set(selectedFileIDs)
      if (newSelectedFileIDsSet.has(file.id)) {
        newSelectedFileIDsSet.delete(file.id)
      } else {
        newSelectedFileIDsSet.add(file.id)
      }
      const newSelectedFiles = workingDirectory.files.filter(f => newSelectedFileIDsSet.has(f.id))
      dispatcher.selectWorkingDirectoryFiles(repository, newSelectedFiles)
      this.setState({ lastClickedFileID: file.id })
    } else {
      // No modifier or Shift-click without a valid anchor
      dispatcher.selectWorkingDirectoryFiles(repository, [file])
      this.setState({ lastClickedFileID: file.id })
    }
  }

  private renderNode = (node: ITreeNode): JSX.Element[] => {
    const renderedNodes: JSX.Element[] = []
    const isExpanded = this.state.expandedNodes.has(node.id)

    const baseStyle: React.CSSProperties = {
      paddingLeft: node.depth * 20,
      display: 'flex',
      alignItems: 'center',
    }

    if (node.kind === 'folder') {
      const folderRowStyle: React.CSSProperties = {
        ...baseStyle, // Includes paddingLeft for indentation and flex properties
        cursor: 'pointer',
        width: '100%', // Ensure the div takes full width for clickability
      }
      renderedNodes.push(
        <div
          key={node.id}
          style={folderRowStyle}
          className="list-item folder-node changes-tree-list-row" // Added changes-tree-list-row for consistency if needed
          onClick={() => this.toggleNode(node.id)}
        >
          <span className="expansion-icon" style={{ marginRight: '5px' }}>
            {isExpanded ? '▼' : '►'}
          </span>
          <span className="folder-name">{node.name}</span>
        </div>
      )
    } else if (node.file) {
      const isSelected = this.props.selectedFileIDs.includes(node.file.id)
      const isCommitting = false; // Placeholder

      renderedNodes.push(
        <div
          key={node.id}
          className={`list-item file-node changes-tree-list-row ${isSelected ? 'selected' : ''}`}
          style={baseStyle}
          onClick={(e) => this.onFileClicked(node.file!, e)}
        >
          <ChangedFile
            file={node.file}
            include={node.include}
            onIncludeChanged={this.onIncludeChanged}
            availableWidth={this.props.availableWidth ? this.props.availableWidth - (node.depth * 20) - 20 : 0}
            disableSelection={isCommitting}
            focused={isSelected}
            onOpenFileInExternalEditor={this.props.onOpenItemInExternalEditor}
            repository={this.props.repository}
          />
        </div>
      )
    }

    if (isExpanded && node.children) {
      node.children.forEach(child => {
        renderedNodes.push(...this.renderNode(child))
      })
    }
    return renderedNodes
  }

  public render() {
    const { files } = this.props.workingDirectory
    const tree = this.buildTree(files)

    return (
      <div className="changes-tree-list file-list">
        {tree.map(node => this.renderNode(node))}
      </div>
    )
  }
}
