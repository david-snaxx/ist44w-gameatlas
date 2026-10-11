/*
 * Dialogue trees (frontend/src/data/dialogueGraph.js). A dialogue has two shapes:
 * - the saved dialogue: nodes and connections (edges) as the React Flow canvas uses them, layout included
 * - the downloaded file: every node says where it leads, and the layout is left out (PLAN.md §5.5)
 */

/** One branching conversation, as it is stored while being written. */
export interface Dialogue {
    /** Internal unique ID (a UUID). Never shown to users and never exported. */
    id: string
    /** The ID users see: snake_case, unique among dialogues. */
    key: string
    /** The name displayed in the UI. */
    name: string
    /** '' when there is none. */
    description: string
    /** The ID of the blueprint whose assets can speak lines, or '' when none is chosen (everything is narration). */
    speakerBlueprint: string
    /** The ID of the blueprint whose assets can be given as items, or '' when none is chosen. */
    itemBlueprint: string
    /** Every step of the conversation. See: {@link DialogueNode}. */
    nodes: DialogueNode[]
    /** How the steps connect. See: {@link DialogueEdge}. */
    edges: DialogueEdge[]
    /** ISO 8601 date and time, e.g. "2026-09-13T10:00:00.000Z". */
    createdAt: string
    /** Last ISO 8601 update time. */
    updatedAt: string
}

/**
 * One step of the conversation on the canvas. Its `type` decides what's in `data`.
 * Dialogues can be saved unfinished, so text and IDs in `data` may still be ''.
 */
export type DialogueNode = StartNode | LineNode | ChoiceNode | ConditionNode | ActionNode | EndNode

/** What every node has. `id` looks like "line_1" and appears in the downloaded file. */
interface NodeBase {
    id: string
    /** Where the node sits on the canvas. Never exported. */
    position: Position
}

/** A point on the canvas, in React Flow's coordinates. */
export interface Position {
    x: number
    y: number
}

/** Where the conversation begins. Every dialogue has exactly one, with the ID "start". */
export interface StartNode extends NodeBase {
    type: 'start'
    /** Nothing to fill in, so the object is always empty. */
    data: Record<string, never>
}

/** Someone says something. The most common node. */
export interface LineNode extends NodeBase {
    type: 'line'
    data: {
        /** The speaking asset's key, or '' for the narrator. */
        speaker: string
        /** What is said. May hold rich-text tags (PLAN.md §5.8). */
        text: string
    }
}

/** The player picks one response. Each response has its own output on the canvas. */
export interface ChoiceNode extends NodeBase {
    type: 'choice'
    data: {
        /** The responses offered, in the order they're shown. See: {@link ChoiceOption}. */
        options: ChoiceOption[]
    }
}

/** One thing the player can say. */
export interface ChoiceOption {
    /** Unique within its node, e.g. "response_1". */
    id: string
    /** What the player says. */
    text: string
}

/** "Check flag" in the UI: goes one way if a story flag is set and another if it isn't. */
export interface ConditionNode extends NodeBase {
    type: 'condition'
    data: {
        /** The story flag's name. */
        flag: string
    }
}

/** Gives the player an item or sets a story flag. Both sets of settings are kept, whichever is chosen. */
export interface ActionNode extends NodeBase {
    type: 'action'
    data: {
        /** Which of the two sets of settings below is in use. */
        action: 'giveItem' | 'setFlag'
        /** Give item: the item asset's key. */
        item: string
        /** Give item: how many. '' while the box is empty. */
        quantity: number | ''
        /** Set story flag: the flag's name. */
        flag: string
        /** Set story flag: true sets it, false clears it. */
        value: boolean
    }
}

/** The conversation finishes here. A dialogue needs at least one. */
export interface EndNode extends NodeBase {
    type: 'end'
    /** Nothing to fill in, so the object is always empty. */
    data: Record<string, never>
}

/** A connection from one node's output to the next node. Never exported as-is. */
export interface DialogueEdge {
    /** Made by edgeId(): "line_1:next->choice_1". */
    id: string
    /** The node the connection leaves from. */
    source: string
    /**
     * Which output it leaves from: "next" (start, line, action), "yes" / "no" (condition),
     * or "option:<response id>" (choice).
     */
    sourceHandle: string
    /** The node it leads to. */
    target: string
}

/**
 * Something wrong with a dialogue (validateDialogueGraph() in frontend/src/data/dialogueGraph.js).
 * A dialogue with problems can be saved, but not downloaded.
 */
export interface DialogueProblem {
    /** Unique within one check, for React's `key`. */
    id: string
    /** The node with the problem, or null when it's about the whole dialogue. */
    nodeId: string | null
    /** What to fix, written for the person writing the dialogue. */
    message: string
}

// ---------- The downloaded file ----------

/** The engine-facing dialogue file (toDialogueExport()). Every `next`-style field is a node ID, or null. */
export interface DialogueExport {
    /** The dialogue's `key` (not its internal UUID). */
    id: string
    type: 'dialogue'
    /** The name displayed in the UI. */
    name: string
    /** Left out when empty. */
    description?: string
    /** The ID of the blueprint speakers come from, or null when none is chosen. */
    speakerBlueprint: string | null
    /** The ID of the blueprint given items come from, or null when none is chosen. */
    itemBlueprint: string | null
    /** The first node after Start. The Start node itself isn't in the file. */
    startNode: string | null
    /** Every node except Start. See: {@link ExportedNode}. */
    nodes: ExportedNode[]
}

/** One node in the downloaded file. Its `type` says which shape it is. */
export type ExportedNode =
    | ExportedLine
    | ExportedChoice
    | ExportedCheckFlag
    | ExportedGiveItem
    | ExportedSetFlag
    | ExportedEnd

/** An exported {@link LineNode}. */
export interface ExportedLine {
    id: string
    type: 'line'
    /** The speaking asset's key, or null for the narrator. */
    speaker: string | null
    /** What is said. */
    text: string
    /** The node this leads to. */
    next: string | null
}

/** An exported {@link ChoiceNode}. */
export interface ExportedChoice {
    id: string
    type: 'choice'
    /** One entry per response, each leading somewhere of its own. */
    responses: ExportedResponse[]
}

/** An exported {@link ChoiceOption}, with the node its branch leads to. */
export interface ExportedResponse {
    id: string
    /** What the player says. */
    text: string
    /** The node this response leads to. */
    next: string | null
}

/** An exported {@link ConditionNode}. */
export interface ExportedCheckFlag {
    id: string
    type: 'checkFlag'
    /** The story flag to check. */
    flag: string
    /** The node to go to when the flag is set. */
    ifSet: string | null
    /** The node to go to when it isn't. */
    ifNotSet: string | null
}

/** An exported {@link ActionNode} whose action is 'giveItem'. */
export interface ExportedGiveItem {
    id: string
    type: 'giveItem'
    /** The item asset's key, or null when none was chosen. */
    item: string | null
    /** How many to give. Always a whole number of 1 or more. */
    quantity: number
    /** The node this leads to. */
    next: string | null
}

/** An exported {@link ActionNode} whose action is 'setFlag'. */
export interface ExportedSetFlag {
    id: string
    type: 'setFlag'
    /** The story flag's name. */
    flag: string
    /** true sets it, false clears it. */
    value: boolean
    /** The node this leads to. */
    next: string | null
}

/** An exported {@link EndNode}. The conversation stops here. */
export interface ExportedEnd {
    id: string
    type: 'end'
}
