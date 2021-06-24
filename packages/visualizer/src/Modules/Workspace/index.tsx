import { FC } from "react"
import { RouteComponentProps } from "@reach/router"
import SplitPane from "react-split-pane"

import EditorPane from "./EditorPane"
import ViewerPane from "./ViewerPane"
import "./styles.css"

const Workspace: FC<RouteComponentProps> = () => {
  return (
    <SplitPane defaultSize={350} minSize={350} maxSize={750}>
      <EditorPane />
      <ViewerPane />
    </SplitPane>
  )
}

export default Workspace
