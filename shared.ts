export interface Repository {
  owner: string
  name: string
}

export interface Label {
  name: string
}

export interface ParentIssue {
  repo: Repository
  number: number
}

export function makeChecklistMarker(label: Label, repo: Repository): string {
  return `<!-- DO NOT MODIFY: ${label.name}:${repo.owner}/${repo.name} -->`
}

export function updateBodyChildChecklists(body: string, childURL: string, checked: boolean): string {
  return body.replace(makeChecklist(childURL, !checked), makeChecklist(childURL, checked))
}

export function makeParentMarker(owner: string, repo: string, number: number): string {
  return `<!-- PARENT-ID: ${owner}/${repo}#${number} -->`
}

export function getParent(body: string): ParentIssue | null {
  const regex = new RegExp('<!-- PARENT-ID: ([a-zA-Z-_]+)/([a-zA-Z-_]+)#([0-9]+) -->')
  const match = regex.exec(body)
  if (match == null || match.length != 4) {
    return null
  }
  const number = Number(match[3])
  if (number == NaN) {
    return null
  }
  return {
    repo: {
      owner: match[1],
      name: match[2]
    },
    number: number
  }
}

export function makeChecklist(childURL: string, checked: boolean): string {
  const check = checked ? "x" : " "
  return `- [${check}] ${childURL}`
}