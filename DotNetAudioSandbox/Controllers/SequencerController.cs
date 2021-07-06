using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using DotNetAudioSandbox.Models;

namespace DotNetAudioSandbox.Controllers
{
  public class SequencerController : Controller
  {
    public ActionResult Index()
    {
      return View();
    }
  }
}