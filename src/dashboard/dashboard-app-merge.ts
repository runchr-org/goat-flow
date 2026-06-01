/**
 * Shared glue for dashboard Alpine app fragments.
 *
 * Object spread copies getter values. Descriptor merging preserves getters and
 * method `this` binding after app state is assembled from small fragments.
 */
type DashboardAppContext = DashboardTerminalContext &
  DashboardProjectsContext &
  DashboardSetupQualityContext &
  DashboardPromptsContext &
  DashboardCustomPromptsContext &
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: Alpine fragments add methods dynamically across classic-script files, so the merged app's extra members cannot be typed statically here.
  Record<string, any>;

type DashboardAppFragment = Record<string, unknown> &
  ThisType<DashboardAppContext>;

function dashboardMergeAppFragments(
  ...fragments: DashboardAppFragment[]
): DashboardAppContext {
  const target: Record<string, unknown> = {};
  for (const fragment of fragments) {
    Object.defineProperties(target, Object.getOwnPropertyDescriptors(fragment));
  }
  return target as DashboardAppContext;
}
