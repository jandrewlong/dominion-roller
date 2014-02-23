package dominionroller;

import java.io.*;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;

public class CardSetServlet extends HttpServlet
{
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
		if (setId.matches("/^\\d+$/")) {
			doGetSet(setId, resp);
		}

		resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
		resp.setContentType("text/plain");
		resp.getWriter().println("Bad request");
	}

	void doInfoQuery(HttpServletResponse resp)
		throws IOException
	{
		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
				);
		out.writeStartObject();
		out.writeStringField("last_set", "1");
		out.writeEndObject();
		out.close();
	}

	void doGetSet(String setId, HttpServletResponse resp)
		throws IOException
	{
		resp.setContentType("text/json");
		resp.getWriter().println("{}");
	}

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
	}
}
