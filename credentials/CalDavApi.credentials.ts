import type { ICredentialType, INodeProperties } from "n8n-workflow";

export class CalDavApi implements ICredentialType {
  name = "calDavApi";

  displayName = "CalDAV API";

  documentationUrl = "caldav";

  properties: INodeProperties[] = [
    {
      displayName: "Server URL",
      name: "serverUrl",
      type: "string",
      default: "",
      placeholder: "https://caldav.example.com",
      description:
        "The CalDAV server URL. For Nextcloud, include /remote.php/dav",
      required: true,
    },
    {
      displayName: "Username",
      name: "username",
      type: "string",
      default: "",
      required: true,
    },
    {
      displayName: "Password",
      name: "password",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
    },
  ];
}
