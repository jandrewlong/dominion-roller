package dominionroller;

import java.io.*;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import java.util.Date;
import java.util.logging.Logger;

public class CardSetServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(CardSetServlet.class.getName());

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String qs = req.getQueryString();
		if (qs.equals("info")) {
			doInfoQuery(resp);
			return;
		}

		String setId = req.getParameter("set");
		if (setId.matches("^\\d+$")) {
			try {
				doGetSet(setId, resp);
				return;
			}
			catch (EntityNotFoundException e) {
				resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
				resp.setContentType("text/plain");
				resp.getWriter().println("Not found");
				return;
			}
		}

		resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
		resp.setContentType("text/plain");
		resp.getWriter().println("Bad request");
	}

	void doInfoQuery(HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();

		String group = "default";
		long lastSetId;

		Key groupKey = KeyFactory.createKey("DominionGroup", group);
		try {
			Entity groupEnt = datastore.get(groupKey);
			lastSetId = (Long) groupEnt.getProperty("lastSetId");
		}
		catch (EntityNotFoundException e) {
			lastSetId = 0;
		}

		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
				);
		out.writeStartObject();
		out.writeStringField("last_set", Long.toString(lastSetId));
		out.writeEndObject();
		out.close();
	}

	void doGetSet(String setId, HttpServletResponse resp)
		throws IOException, EntityNotFoundException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		String group = "default";

		Key groupKey = KeyFactory.createKey("DominionGroup", group);
		Key setKey = KeyFactory.createKey(groupKey, "Cardset",
			Long.parseLong(setId)
			);

		Entity cardset = datastore.get(setKey);
		String content = (String) cardset.getProperty("content");

		resp.setContentType("text/json");
		resp.getWriter().write(content);
	}

	static String getRequestContent(HttpServletRequest req)
		throws IOException
	{
		StringBuilder sb = new StringBuilder();
		Reader r = req.getReader();
		char [] cbuf = new char[1024];
		int nread;

		while ( (nread = r.read(cbuf)) != -1 )
		{
			sb.append(cbuf, 0, nread);
		}

		return sb.toString();
	}

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{

		String group = "default";

		Key groupKey = KeyFactory.createKey("DominionGroup", group);
		Entity groupEnt;

		try {
			groupEnt = datastore.get(txn, groupKey);

		} catch (EntityNotFoundException e) {
			groupEnt = new Entity(groupKey);
		}

		long setId = 0;
		if (groupEnt.hasProperty("lastSetId")) {
			setId = (Long) groupEnt.getProperty("lastSetId");
		}
		setId++;
		groupEnt.setProperty("lastSetId", new Long(setId));
		datastore.put(groupEnt);

		Key setKey = KeyFactory.createKey(groupKey, "Cardset", setId);

		String content = getRequestContent(req);
		Date createdDate = new Date();
		String creatorIp = req.getRemoteAddr();

		Entity cardset = new Entity(setKey);
		cardset.setProperty("content", content);
		cardset.setProperty("created", createdDate);
		cardset.setProperty("createdBy", creatorIp);

		datastore.put(cardset);
		txn.commit();

		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
				);
		out.writeStartObject();
		out.writeStringField("url",
			req.getContextPath() + "/cardset.php?set=" + setId
			);
		out.writeStringField("shortname", Long.toString(setId));
		out.writeEndObject();
		out.close();

		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}
}
