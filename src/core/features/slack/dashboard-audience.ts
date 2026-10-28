/** Dashboard sharing is independent of its source records; a ready link must stay within that sharing. */
const dashboardVisibleTo=(viewer:string)=>`(
 ${viewer}.setup_owner=1 OR EXISTS(SELECT 1 FROM sales_roles admin_role WHERE admin_role.operator_id=${viewer}.id AND admin_role.role='sales-admin')
 OR d.owner_id=${viewer}.id OR json_extract(sh.body_json,'$.audience')='workspace'
 OR (json_extract(sh.body_json,'$.audience')='named' AND EXISTS(SELECT 1 FROM json_each(sh.body_json,'$.grants') WHERE json_extract(value,'$.operatorId')=${viewer}.id))
 OR (json_extract(sh.body_json,'$.audience')='teams' AND EXISTS(SELECT 1 FROM json_each(sh.body_json,'$.teamGrants') share_team JOIN sales_team_members member ON member.team_id=json_extract(share_team.value,'$.teamId') JOIN sales_teams native_team ON native_team.id=member.team_id AND native_team.active=1 WHERE member.operator_id=${viewer}.id))
)`;
/** Legacy internal channels keep their generic-ready behavior. Native restricted roles and team routes check each intended viewer. */
export const dashboardAudienceSql=`
 NOT EXISTS(SELECT 1 FROM operators viewer
 WHERE viewer.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=viewer.id)
 AND (c.audience_team_id IS NOT NULL OR EXISTS(SELECT 1 FROM sales_roles viewer_role WHERE viewer_role.operator_id=viewer.id))
 AND (c.audience_team_id IS NULL OR EXISTS(SELECT 1 FROM sales_team_members audience_member JOIN sales_teams audience_team ON audience_team.id=audience_member.team_id AND audience_team.active=1 WHERE audience_member.operator_id=viewer.id AND audience_member.team_id=c.audience_team_id))
 AND NOT ${dashboardVisibleTo('viewer')})
 AND (c.audience_team_id IS NULL OR EXISTS(SELECT 1 FROM sales_teams native_team JOIN sales_team_members member ON member.team_id=native_team.id JOIN operators viewer ON viewer.id=member.operator_id AND viewer.status='active' WHERE native_team.id=c.audience_team_id AND native_team.active=1 AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=viewer.id)))`;
