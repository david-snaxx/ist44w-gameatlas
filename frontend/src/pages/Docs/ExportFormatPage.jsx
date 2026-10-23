import AppShell from '../../components/AppShell/AppShell.jsx'
import JsonPreview from '../../components/JsonPreview/JsonPreview.jsx'
import Section from '../../components/Section/Section.jsx'
import {toData, toExport} from '../../data/assetData.js'
import {toDialogueExport} from '../../data/dialogueGraph.js'
import {STARTER_ASSETS} from '../../data/starterAssets.js'
import {STARTER_DIALOGUES} from '../../data/starterDialogues.js'
import {toDefinition, toDraft} from '../../schema/blueprintDraft.js'
import {FIELD_TYPES, TYPE_SETTINGS} from '../../schema/fieldTypes.js'
import {STARTER_BLUEPRINTS} from '../../schema/starterBlueprints.js'
import styles from './ExportFormatPage.module.css'

/*
 * Reference for the JSON files GameAtlas exports (/docs/export-format), written for programmers. Every example is made
 * from the starter project by the same functions the real downloads use, so the page follows the export by itself.
 */

/** The example asset: the first starter asset, as "Export asset" downloads it. */
const EXAMPLE_ASSET = STARTER_ASSETS[0]
const ASSET_FILE = toExport(EXAMPLE_ASSET)

/** The example asset's blueprint, as the blueprint builder downloads it. */
const EXAMPLE_BLUEPRINT = STARTER_BLUEPRINTS.find((blueprint) => blueprint.id === EXAMPLE_ASSET.schemaId)
const BLUEPRINT_FILE = toDefinition(toDraft(EXAMPLE_BLUEPRINT))

/** The first starter dialogue, as the dialogue editor downloads it. */
const DIALOGUE_FILE = toDialogueExport(STARTER_DIALOGUES[0])

/** Every file a programmer may be handed: its name, where in GameAtlas it's downloaded, and what's in it. */
const FILES = [
    {name: '<asset ID>.json', where: "An asset's page (Export asset) or its editor", contents: 'One asset'},
    {
        name: '<blueprint ID>.assets.json',
        where: "A blueprint's asset list (Download all), or All assets filtered to that blueprint",
        contents: "An array of that blueprint's assets",
    },
    {name: 'assets.json', where: 'All assets (Download all)', contents: 'An array of assets of every blueprint'},
    {name: '<dialogue ID>.dialogue.json', where: 'The dialogue editor', contents: 'One dialogue'},
    {name: 'dialogues.json', where: 'All dialogues (Download all)', contents: 'An array of dialogues'},
    {
        name: '<blueprint ID>.blueprint.json',
        where: 'The blueprint builder',
        contents: 'One blueprint. For tools and for moving it between projects; a game doesn’t need it',
    },
]

/** What each key of an asset file means. A key the export gains without an entry here shows a dash. */
const ASSET_KEYS = {
    id: (
        <>
            The asset’s ID, unique among its blueprint’s assets. Links from other assets and from dialogues use it.
        </>
    ),
    blueprint: <>The ID of the blueprint the asset was made from.</>,
    blueprintVersion: (
        <>
            The blueprint’s <code>version</code> when the asset was last saved. When the blueprint’s version is higher
            now,
            it changed since, and <code>data</code> still has the older shape.
        </>
    ),
    data: (
        <>
            The values, by property ID. They sit under <code>data</code>, so a property called <code>id</code> can never
            clash with the asset’s own.
        </>
    ),
}

/** Programmer notes on each property type's value in an asset's data. */
const TYPE_NOTES = {
    string: <>Text on one line, at most the property’s <code>maxLength</code> if it has one.</>,
    text: <>Text that may contain line breaks (<code>\n</code>), exactly as typed.</>,
    int: <>A whole number, between the property’s <code>min</code> and <code>max</code> if it has them.</>,
    float: <>A number, between <code>min</code> and <code>max</code> if set.</>,
    bool: <>true or false.</>,
    enum: <>One of the property’s <code>options</code>, as text.</>,
    vector2: <>The shape Unity’s JsonUtility reads straight into a <code>Vector2</code>.</>,
    vector3: <>The shape Unity’s JsonUtility reads straight into a <code>Vector3</code>.</>,
    reference: (
        <>
            The linked asset’s <code>id</code>. Its blueprint is the property’s <code>targetSchema</code>.
        </>
    ),
    list: <>An array of values of the list’s item type.</>,
    object: <>An object of its own properties, by property ID, like a class inside a class.</>,
}

/** What each key of a dialogue file means. */
const DIALOGUE_KEYS = {
    id: <>The dialogue’s ID.</>,
    type: (
        <>
            Always <code>"dialogue"</code>.
        </>
    ),
    name: <>The dialogue’s name, for people.</>,
    description: <>A note about the dialogue. Only there when it has one.</>,
    speakerBlueprint: (
        <>
            The blueprint whose assets speak the lines (a line’s <code>speaker</code> is one of their IDs), or{' '}
            <code>null</code>.
        </>
    ),
    itemBlueprint: (
        <>
            The blueprint whose assets the dialogue can give (a <code>giveItem</code>’s <code>item</code>), or{' '}
            <code>null</code>.
        </>
    ),
    startNode: <>The ID of the node the conversation starts at.</>,
    nodes: <>Every node, in no particular order. Look them up by ID.</>,
}

/** What each node type in a dialogue file does, by its `type`. */
const NODE_NOTES = {
    line: (
        <>
            Someone says something. <code>speaker</code> is a <code>speakerBlueprint</code> asset’s ID, or{' '}
            <code>null</code> for a narrator. <code>text</code> is a plain string exactly as typed, so TextMeshPro’s own
            tags such as <code>{'<b>'}</code> work in it.
        </>
    ),
    choice: (
        <>
            The player picks one of the <code>responses</code>; each leads to its own <code>next</code>.
        </>
    ),
    checkFlag: (
        <>
            Goes to <code>ifSet</code> when the story flag is set, and to <code>ifNotSet</code> when it isn’t. The game
            keeps
            the flags; GameAtlas only names them.
        </>
    ),
    giveItem: (
        <>
            The game gives the player <code>quantity</code> (1 or more) of <code>item</code>, an{' '}
            <code>itemBlueprint</code> asset’s ID.
        </>
    ),
    setFlag: (
        <>
            Sets the story flag (<code>value: true</code>) or clears it (<code>false</code>).
        </>
    ),
    end: <>The conversation is over.</>,
}

/** What each key of a blueprint file means. */
const BLUEPRINT_KEYS = {
    id: (
        <>
            The blueprint’s ID. Assets name it in their <code>blueprint</code>.
        </>
    ),
    name: <>The blueprint’s name, for people.</>,
    description: <>A note about the blueprint. Only there when it has one.</>,
    kind: (
        <>
            Always <code>"form"</code>.
        </>
    ),
    version: (
        <>
            Goes up by one each time a change to the blueprint is saved. Assets record it
            as <code>blueprintVersion</code>.
        </>
    ),
    fields: <>The properties, in the order the form shows them.</>,
}

/** What each key every property has (or may have) means. Type-specific settings are in their own table. */
const PROPERTY_KEYS = {
    key: (
        <>
            The property’s ID: the key of its value in an asset’s <code>data</code>.
        </>
    ),
    label: <>The property’s name, for people.</>,
    type: <>One of the types in the table below.</>,
    required: (
        <>
            <code>true</code> when an asset must fill it in. Left out otherwise.
        </>
    ),
    help: <>A hint shown under the input. Only there when it has one.</>,
}

/** What each type-specific property setting means. */
const SETTING_NOTES = {
    maxLength: <>The most characters allowed.</>,
    default: <>The value a new asset starts with.</>,
    min: <>The lowest value allowed.</>,
    max: <>The highest value allowed.</>,
    options: <>The choices, as an array of text.</>,
    targetSchema: <>The ID of the blueprint whose assets a link may point at.</>,
    itemType: (
        <>
            Each value’s type: <code>{'{ "type": … }'}</code> plus that type’s settings, except <code>default</code>.
        </>
    ),
    fields: <>The group’s own properties, in the same shape as the blueprint’s.</>,
}

/** The export format reference page (/docs/export-format). Open without logging in, so it can be shared. */
function ExportFormatPage() {
    return (
        <AppShell crumbs={[{label: 'Documentation'}, {label: 'Export format'}]}>
            <div className={styles.page}>
                <header>
                    <h1>Export format</h1>
                    <p className="page-intro">
                        GameAtlas produces JSON documents. This page will describe the expected formats of these
                        documents.
                        These documents are meant to be general, however may require alterations to your project's
                        object/schema
                        shape to be compatible.
                    </p>
                </header>

                <FilesSection/>
                <AssetsSection/>
                <DialoguesSection/>
                <BlueprintsSection/>
            </div>
        </AppShell>
    )
}

/** Which files exist and the rules all of them follow. */
function FilesSection() {
    const rows = []
    for (const file of FILES) {
        rows.push(
            <tr key={file.name}>
                <td>
                    <code className={styles.fileName}>{file.name}</code>
                </td>
                <td>{file.where}</td>
                <td>{file.contents}</td>
            </tr>,
        )
    }

    return (
        <Section title="Files">
            <Part title="What gets downloaded">
                <table className={styles.reference}>
                    <thead>
                    <tr>
                        <th>File</th>
                        <th>Downloaded from</th>
                        <th>Contents</th>
                    </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
            </Part>

            <Part title="Rules every file follows">
                <div className={styles.prose}>
                    <ul>
                        <li>UTF-8 JSON with two-space indentation.</li>
                        <li>
                            A file only downloads when everything in it is ready: required properties filled in, links
                            pointing at
                            assets that exist, and every step of a dialogue connected. A game never receives a
                            half-finished file.
                        </li>
                        <li>
                            Asset, blueprint and dialogue IDs start with a lowercase letter, then use lowercase letters,
                            numbers and
                            underscores (<code>sword_of_fire</code>), up to 64 characters. Property IDs and story flags
                            may also use
                            capitals (<code>gripOffset</code>).
                        </li>
                        <li>
                            The “Download all” files are a top-level array. Unity’s JsonUtility can’t read one directly:
                            wrap the text
                            first (<code>{'{ "items": … }'}</code> into a class with an array field), or use a JSON
                            library such as
                            Newtonsoft.
                        </li>
                        <li>
                            Backups (from Settings) are for restoring GameAtlas, not for games: they keep editor-only
                            data such as
                            where each dialogue node sits on the canvas.
                        </li>
                    </ul>
                </div>
            </Part>
        </Section>
    )
}

/** Asset files: the keys, an example, and what each property type looks like. */
function AssetsSection() {
    return (
        <Section title="Assets">
            <Part title="What an asset is">
                <div className={styles.prose}>
                    <p>
                        An asset is one piece of game data: an item, a character, a skill. They're the most commonly and
                        widely
                        applicable form of data carriers. Each asset is made from a "Blueprint" which is explained later
                        in
                        this page and is not intended for game engines like Assets are.
                    </p>
                </div>
            </Part>

            <Part title="The file">
                <KeyTable example={ASSET_FILE} descriptions={ASSET_KEYS}/>
            </Part>

            <Part title={`Example: ${ASSET_FILE.id}.json`}>
                <JsonPreview value={ASSET_FILE} alwaysVisible/>
            </Part>

            <Part title="Values by property type">
                <div className={styles.prose}>
                    <p>
                        The keys in <code>data</code> are the blueprint’s property IDs. A property added to the
                        blueprint after the
                        asset was last saved is missing until it’s saved again, so treat a missing key like an empty
                        value.
                    </p>
                </div>
                <PropertyTypesTable/>
            </Part>
        </Section>
    )
}

/** One row per property type: an example value from the starter assets, its empty value, and notes. */
function PropertyTypesTable() {
    const rows = []
    for (const type of Object.keys(FIELD_TYPES)) {
        rows.push(<PropertyTypeRow key={type} type={type}/>)
    }

    return (
        <table className={styles.reference}>
            <thead>
            <tr>
                <th>Type</th>
                <th>Example</th>
                <th>When left empty</th>
                <th>Notes</th>
            </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
    )
}

/** One property type's row. The example and empty values come from the app's own data and conversion code. */
function PropertyTypeRow({type}) {
    const example = findExampleValue(type)

    let exampleCell = <span className="muted">No example yet</span>
    let emptyCell = <span className="muted">—</span>
    if (example) {
        exampleCell = <code>{JSON.stringify(example.value)}</code>
        emptyCell = <code>{JSON.stringify(emptyValueOf(example.field))}</code>
    }

    let notes = TYPE_NOTES[type]
    if (!notes) {
        notes = FIELD_TYPES[type].description
    }

    return (
        <tr>
            <td>
                {FIELD_TYPES[type].label}
                <br/>
                <code className="muted">{type}</code>
            </td>
            <td>{exampleCell}</td>
            <td>{emptyCell}</td>
            <td>{notes}</td>
        </tr>
    )
}

/** Dialogue files: the keys, how to play one, every node type, and an example. */
function DialoguesSection() {
    return (
        <Section title="Dialogues">
            <Part title="What a dialogue is">
                <div className={styles.prose}>
                    <p>
                        A dialogue is a branching conversation, stored as a list of nodes. Each node says which node
                        comes next, so
                        you may think of these like cyclic graphs in JSON form. These are much more opinionated than
                        Assets and
                        may require alterations to your game's code to become compatible.
                    </p>
                </div>
            </Part>

            <Part title="The file">
                <KeyTable example={DIALOGUE_FILE} descriptions={DIALOGUE_KEYS}/>
            </Part>

            <Part title="Playing one">
                <div className={styles.prose}>
                    <ol>
                        <li>
                            Find the node whose <code>id</code> is <code>startNode</code>.
                        </li>
                        <li>
                            Do what its <code>type</code> says (see below), then go to the node
                            its <code>next</code> names. A choice
                            goes to the picked response’s <code>next</code>; a flag check to <code>ifSet</code> or{' '}
                            <code>ifNotSet</code>.
                        </li>
                        <li>
                            Stop at a node of type <code>end</code>. In a downloaded file every one of these links
                            points at a node in
                            the file: none is <code>null</code>.
                        </li>
                    </ol>
                </div>
            </Part>

            <Part title="Node types">
                <NodeTypes nodes={DIALOGUE_FILE.nodes}/>
            </Part>

            <Part title={`Example: ${DIALOGUE_FILE.id}.dialogue.json`}>
                <JsonPreview value={DIALOGUE_FILE} alwaysVisible/>
            </Part>
        </Section>
    )
}

/** Each node type the example dialogue uses, with what it does and the example's first node of that type. */
function NodeTypes({nodes}) {
    const items = []
    for (const node of firstNodeOfEachType(nodes)) {
        let notes = NODE_NOTES[node.type]
        if (!notes) {
            notes = '—'
        }
        items.push(
            <div key={node.type} className={styles.nodeType}>
                <div className={styles.prose}>
                    <p>
                        <code>{node.type}</code>: {notes}
                    </p>
                </div>
                <pre className={styles.code}>{JSON.stringify(node, null, 2)}</pre>
            </div>,
        )
    }
    return <div>{items}</div>
}

/** Blueprint files: what they're for, the keys, property settings by type, and an example. */
function BlueprintsSection() {
    return (
        <Section title="Blueprints">
            <Part title="What a blueprint is">
                <div className={styles.prose}>
                    <p>
                        A blueprint is GameAtlas’s description of one kind of asset, that is, its properties and their
                        rules. You
                        can think of it like a class, data carrier object, or schema definition. A game doesn’t need it
                        to read assets.
                        These could become useful for tools, such as generating classes or checking asset files, and for
                        moving a
                        blueprint to another project (Import blueprint). But primarily, they're meant for use with
                        GameAtlas.
                    </p>
                </div>
            </Part>

            <Part title="The file">
                <KeyTable example={BLUEPRINT_FILE} descriptions={BLUEPRINT_KEYS}/>
            </Part>

            <Part title="Each property">
                <KeyTable example={PROPERTY_KEYS} descriptions={PROPERTY_KEYS}/>
            </Part>

            <Part title="Settings by property type">
                <div className={styles.prose}>
                    <p>A setting that’s empty is left out of the file.</p>
                </div>
                <SettingsTable/>
            </Part>

            <Part title={`Example: ${BLUEPRINT_FILE.id}.blueprint.json`}>
                <JsonPreview value={BLUEPRINT_FILE} alwaysVisible/>
            </Part>
        </Section>
    )
}

/** One row per property type with the settings it can have, read from the field-type registry. */
function SettingsTable() {
    const rows = []
    for (const type of Object.keys(FIELD_TYPES)) {
        rows.push(<SettingsRow key={type} type={type}/>)
    }

    return (
        <table className={styles.reference}>
            <thead>
            <tr>
                <th>Type</th>
                <th>Settings</th>
            </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
    )
}

/** One property type's settings, each with what it means. */
function SettingsRow({type}) {
    const settings = TYPE_SETTINGS[type] ?? []

    const items = []
    for (const setting of settings) {
        let notes = SETTING_NOTES[setting]
        if (!notes) {
            notes = '—'
        }
        items.push(
            <li key={setting}>
                <code>{setting}</code>: {notes}
            </li>,
        )
    }

    let settingsCell = <span className="muted">None</span>
    if (items.length > 0) {
        settingsCell = (
            <div className={styles.prose}>
                <ul>{items}</ul>
            </div>
        )
    }

    return (
        <tr>
            <td>
                {FIELD_TYPES[type].label}
                <br/>
                <code className="muted">{type}</code>
            </td>
            <td>{settingsCell}</td>
        </tr>
    )
}

/** A table of an example object's keys and what each means; a key without a description shows a dash. */
function KeyTable({example, descriptions}) {
    const rows = []
    for (const key of Object.keys(example)) {
        let description = descriptions[key]
        if (!description) {
            description = '—'
        }
        rows.push(
            <tr key={key}>
                <td>
                    <code>{key}</code>
                </td>
                <td>{description}</td>
            </tr>,
        )
    }

    return (
        <table className={styles.reference}>
            <thead>
            <tr>
                <th>Key</th>
                <th>Meaning</th>
            </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
    )
}

/** One topic inside a section, under a small heading. */
function Part({title, children}) {
    return (
        <div className={styles.part}>
            <h3 className={styles.partTitle}>{title}</h3>
            {children}
        </div>
    )
}

// The first starter property of this type and its value in a starter asset: { field, value }, or null if none has one
function findExampleValue(type) {
    for (const blueprint of STARTER_BLUEPRINTS) {
        const field = blueprint.fields.find((candidate) => candidate.type === type)
        if (!field) {
            continue
        }
        for (const asset of STARTER_ASSETS) {
            const hasValue = asset.schemaId === blueprint.id && asset.data[field.key] !== undefined
            if (hasValue) {
                return {field: field, value: asset.data[field.key]}
            }
        }
    }
    return null
}

// What a property is saved as when nothing was filled in, worked out by the same code that saves assets
function emptyValueOf(field) {
    return toData([field], {})[field.key]
}

// The first node of each type, in the order they first appear
function firstNodeOfEachType(nodes) {
    const firsts = []
    for (const node of nodes) {
        const seen = firsts.some((first) => first.type === node.type)
        if (!seen) {
            firsts.push(node)
        }
    }
    return firsts
}

export default ExportFormatPage
