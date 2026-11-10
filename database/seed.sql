INSERT INTO opportunity_categories(name) VALUES('Technology'),('Business'),('Finance'),('Engineering'),('Research'),('Healthcare') ON CONFLICT DO NOTHING;
INSERT INTO organizations(name,email,website,address) VALUES('College Career Services','careers@college.edu','https://college.edu','College campus') ON CONFLICT DO NOTHING;
-- Development admin: admin@college.edu / ChangeMe123!
INSERT INTO users(name,email,password_hash,role) VALUES('Portal Administrator','admin@college.edu',crypt('ChangeMe123!',gen_salt('bf')),'admin') ON CONFLICT(email) DO NOTHING;
INSERT INTO opportunities(organization_id,title,type,category_id,department,location,work_arrangement,salary,duration,description,responsibilities,qualifications,skills,deadline,vacancies,application_method,status,featured)
SELECT org.id,'Junior Software Engineering Intern','Internship',cat.id,'Computer Science','Thimphu, Bhutan','Hybrid','Nu. 12,000/month','3 months','Work with a collaborative engineering team on real-world web applications.','Assist with feature development and testing.','Currently enrolled in a relevant degree.','JavaScript, Node.js, SQL',CURRENT_DATE+30,2,'portal','published',true
FROM organizations org CROSS JOIN opportunity_categories cat WHERE org.name='College Career Services' AND cat.name='Technology'
AND NOT EXISTS(SELECT 1 FROM opportunities WHERE title='Junior Software Engineering Intern');
