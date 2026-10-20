/** 后台发布的只读资料，与本地PRD编审内容分开显示。 */
export interface PublishedKnowledge {
  uuid: string;
  versionUuid: string;
  versionNo: number;
  title: string;
  category: string;
  publishedAt: string;
  proContent?: string;
  plainContent?: string;
  references?: string[];
  evidenceNote?: string;
}
export interface PublishedPage {
  records: PublishedKnowledge[];
  nextBeforeId: number | null;
}
