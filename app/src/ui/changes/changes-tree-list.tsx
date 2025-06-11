import * as React from 'react'
import { WorkingDirectoryFileChange } from '../../../models/status'
import { IChangesListProps } from './changes-list' // Assuming similar props might be needed

interface IChangesTreeListProps extends Pick<IChangesListProps, 'workingDirectory' | 'selectedFileIDs' | 'onFileSelectionChanged' | 'onIncludeChanged' | 'availableWidth' | 'onOpenItemInExternalEditor' | 'repository'> {
  // Props specific to tree view, if any, can be added here
}

interface IChangesTreeListState {
  // State specific to tree view, e.g., expanded nodes
  expandedNodes: Set<string>
}

interface ITreeNode {
  id: string
  name: string
  path: string
  kind: 'file' | 'folder'
  file?: WorkingDirectoryFileChange
  children: ITreeNode[]
  depth: number
}

export class ChangesTreeList extends React.Component<IChangesTreeListProps, IChangesTreeListState> {
  constructor(props: IChangesTreeListProps) {
    super(props)
    this.state = {
      expandedNodes: new Set<string>(),
    }
  }

  private buildTree(files: ReadonlyArray<WorkingDirectoryFileChange>): ITreeNode[] {
    const rootNodes: ITreeNode[] = []
    const map = new Map<string, ITreeNode>()

    files.forEach(file => {
      const pathParts = file.path.split('/')
      let currentPath = ''
      let parentNode: ITreeNode | undefined = undefined

      pathParts.forEach((part, index) => {
        const oldPath = currentPath
        currentPath = currentPath ? `${currentPath}/${part}` : part
        const isLastPart = index === pathParts.length - 1

        if (!map.has(currentPath)) {
          const newNode: ITreeNode = {
            id: currentPath,
            name: part,
            path: currentPath,
            kind: isLastPart ? 'file' : 'folder',
            file: isLastPart ? file : undefined,
            children: [],
            depth: index,
          }
          map.set(currentPath, newNode)

          if (parentNode) {
            parentNode.children.push(newNode)
          } else if (index === 0) { // Check if it's a root node before assuming parentNode
            rootNodes.push(newNode)
          }
        }
         parentNode = map.get(currentPath)!

        //This is a workaround for the case where a folder node was created first
        //and then a file with the same path is encountered
        if (isLastPart && parentNode.kind === 'folder' && parentNode.file === undefined) {
          parentNode.kind = 'file'
          parentNode.file = file
        }
      })
    })
    return rootNodes
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

  private renderNode = (node: ITreeNode): JSX.Element[] => {
    const renderedNodes: JSX.Element[] = []
    const isExpanded = this.state.expandedNodes.has(node.id)

    // Placeholder for actual ChangedFile component or similar
    renderedNodes.push(
      <div key={node.id} style={{ paddingLeft: node.depth * 20 }}>
        {node.kind === 'folder' && (
          <span onClick={() => this.toggleNode(node.id)} style={{ cursor: 'pointer' }}>
            {isExpanded ? '▼' : '►'} {node.name}
          </span>
        )}
        {node.kind === 'file' && node.file && (
          // This will be replaced with a proper ChangedFile component rendering
          <span>{node.name}</span>
        )}
      </div>
    )

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
